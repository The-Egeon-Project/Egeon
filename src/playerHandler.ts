import { VoiceState } from 'discord.js';
import { Kazagumo, KazagumoPlayer } from 'kazagumo';
import _ from 'lodash';

import { MESSAGES, Message } from './messages.js';
import { getDuration } from './utils.js';

export class PlayerHandler {
  private static readonly connectingGuilds = new Set<string>();

  constructor(private readonly kazagumo: Kazagumo) {
    this.kazagumo = kazagumo;
  }
  getPlayer(message: Message): KazagumoPlayer | undefined {
    return this.kazagumo.players.get(message.guild.id);
  }

  private async clearStaleVoiceConnection(message: Message) {
    if (message.guild.members.me?.voice.channelId) {
      // Wait for Discord to confirm the leave before requesting a fresh endpoint.
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeout);
          message.client.off('voiceStateUpdate', onVoiceStateUpdate);
        };
        const onVoiceStateUpdate = (
          _oldState: VoiceState,
          newState: VoiceState,
        ) => {
          if (
            newState.guild.id === message.guild.id &&
            newState.id === message.client.user?.id &&
            !newState.channelId
          ) {
            cleanup();
            resolve();
          }
        };
        const timeout = setTimeout(() => {
          cleanup();
          reject(
            new Error(
              'Discord did not confirm leaving the stale voice channel',
            ),
          );
        }, 5_000);
        message.client.on('voiceStateUpdate', onVoiceStateUpdate);
        try {
          message.guild.shard.send({
            op: 4,
            d: {
              guild_id: message.guild.id,
              channel_id: null,
              self_deaf: false,
              self_mute: false,
            },
          });
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    }
    await this.kazagumo.shoukaku.leaveVoiceChannel(message.guild.id);
  }

  // Player Functions
  async play(message: Message, playNext = false) {
    const args = message.content.split(' ');
    const query = args.slice(1).join(' ');

    if (playNext && !query.trim()) {
      return message.reply('🎵 Usage: `!pn <song name or URL>`');
    }

    const channel = message.member?.voice.channel;
    if (!channel) return message.reply(MESSAGES.NO_VOICE_CHANNEL_FOUND);

    if (!this.kazagumo.shoukaku.getIdealNode()) {
      return message.reply(MESSAGES.LAVALINK_UNAVAILABLE);
    }

    let player = this.getPlayer(message);

    if (!player) {
      const guildId = message.guild.id;
      if (PlayerHandler.connectingGuilds.has(guildId)) {
        return message.reply(MESSAGES.VOICE_CONNECTING);
      }
      PlayerHandler.connectingGuilds.add(guildId);
      try {
        await this.clearStaleVoiceConnection(message);
        try {
          player = await this.kazagumo.createPlayer({
            guildId,
            textId: message.channel.id,
            voiceId: channel.id,
          });
        } catch (error) {
          await this.clearStaleVoiceConnection(message).catch(
            (cleanupError) => {
              console.error(
                `Guild ${guildId}: Voice cleanup failed.`,
                cleanupError,
              );
            },
          );
          throw error;
        }
      } finally {
        PlayerHandler.connectingGuilds.delete(guildId);
      }
    }
    const queue = player.queue;

    const result = await this.kazagumo.search(query, {
      requester: message.author,
    });
    const track = result.tracks[0];
    const isPlaylist = result.type === 'PLAYLIST';
    if (!track) return message.reply(MESSAGES.NO_TRACK_FOUND);

    if (playNext) {
      const pendingTracks = [...queue];
      queue.splice(0, queue.length);
      queue.add(isPlaylist ? [...result.tracks] : track);
      queue.add(pendingTracks);
    } else {
      queue.add(isPlaylist ? result.tracks : track);
    }

    if (!player.playing && !player.paused) await player.play();

    if (playNext) {
      return message.reply({
        content: isPlaylist
          ? `⏭️ Added **${result.tracks.length} songs** from *${result.playlistName}* to play next!`
          : `⏭️ **${track.title}** added to play next!`,
      });
    }

    if (_.isEmpty(queue)) {
      return;
    }

    return message.reply({
      content:
        result.type === 'PLAYLIST'
          ? `🎉 Added **${result.tracks.length} songs** from *${result.playlistName}* to the queue!`
          : `✅ **${track.title}** added to the queue 🎵`,
    });
  }

  skip(message: Message) {
    const player = this.getPlayer(message);

    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }

    if (player.queue.length === 0) {
      return message.reply(MESSAGES.NO_SONGS_IN_QUEUE_TO_SKIP);
    }

    player.skip();

    return message.reply({
      content: `⏭️ Skipping!`,
    });
  }

  disconnect(message: Message) {
    const player = this.getPlayer(message);

    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }

    player.destroy();

    return message.reply(MESSAGES.DISCONNECTED);
  }

  pause(message: Message) {
    const player = this.getPlayer(message);
    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }
    player.pause(true);
    return message.reply(MESSAGES.PAUSED);
  }

  resume(message: Message) {
    const player = this.getPlayer(message);

    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }
    player.pause(false);
    return message.reply(MESSAGES.RESUMED);
  }

  queue(message: Message) {
    const player = this.getPlayer(message);

    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }

    const queue = player.queue;
    const current = queue.current;

    const currentPlayingMessage = `🎵 **Now playing:** ${current?.title}\n\n`;

    if (queue.length === 0) {
      return message.reply(
        (!_.isNil(currentPlayingMessage) ? currentPlayingMessage : '') +
          MESSAGES.EMPTY_QUEUE,
      );
    }

    const rawDuration = queue.durationLength;
    const duration = getDuration(rawDuration);

    return message.reply(
      `🎵 **Now playing:** ${current?.title}\n\n` +
        `📋 **Queue:**\n${queue.map((track, index) => `\`${index + 1}.\` ${track.title}`).join('\n')}\n\n` +
        `📊 **Total:** ${queue.length} songs | ⏱️ **Duration:** ${duration}`,
    );
  }
}
