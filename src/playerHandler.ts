import { Kazagumo, KazagumoPlayer } from 'kazagumo';

import { MESSAGES, Message } from './messages.js';
import { getDuration } from './utils.js';

export class PlayerHandler {
  constructor(private readonly kazagumo: Kazagumo) {
    this.kazagumo = kazagumo;
  }
  getPlayer(message: Message): KazagumoPlayer | undefined {
    return this.kazagumo.players.get(message.guild.id);
  }

  // Player Functions
  async play(message: Message) {
    const args = message.content.split(' ');
    const query = args.slice(1).join(' ');

    const { channel } = message.member.voice;
    if (!channel) return message.reply(MESSAGES.NO_VOICE_CHANNEL_FOUND);

    let player = this.getPlayer(message);

    if (!player) {
      player = await this.kazagumo.createPlayer({
        guildId: message.guild.id,
        textId: message.channel.id,
        voiceId: channel.id,
      });
    }

    const result = await this.kazagumo.search(query, {
      requester: message.author,
    });
    const track = result.tracks[0];
    if (!track) return message.reply(MESSAGES.NO_TRACK_FOUND);

    if (result.type === 'PLAYLIST')
      player.queue.add(result.tracks); // do this instead of using for loop if you want queueUpdate not spammy
    else player.queue.add(track);

    if (!player.playing && !player.paused) player.play();

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
      content: `⏭️ Skipping! Now playing **${player.queue[0]?.title}** by **${player.queue[0]?.author}** 🎶`,
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

    if (queue.length === 0) {
      return message.reply(MESSAGES.EMPTY_QUEUE);
    }

    const current = queue.current;
    const rawDuration = queue.durationLength;
    const duration = getDuration(rawDuration);

    return message.reply(
      `🎵 **Now playing:** ${current?.title}\n\n` +
        `📋 **Queue:**\n${queue.map((track, index) => `\`${index + 1}.\` ${track.title}`).join('\n')}\n\n` +
        `📊 **Total:** ${queue.length} songs | ⏱️ **Duration:** ${duration}`,
    );
  }
}
