import { Kazagumo, KazagumoPlayer } from 'kazagumo';

import { Message } from './messages';
import { MESSAGES } from './messages';

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
    if (!channel)
      return message.reply(
        'You need to be in a voice channel to use this command!',
      );

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
    if (!track) return message.reply('No results found!');

    if (result.type === 'PLAYLIST')
      player.queue.add(result.tracks); // do this instead of using for loop if you want queueUpdate not spammy
    else player.queue.add(track);

    if (!player.playing && !player.paused) player.play();

    return message.reply({
      content:
        result.type === 'PLAYLIST'
          ? `Queued ${result.tracks.length} from ${result.playlistName}`
          : `Queued ${track.title}`,
    });
  }

  skip(message: Message) {
    const player = this.getPlayer(message);

    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }

    if (player.queue.length <= 1) {
      return message.reply('There is no song to skip to!');
    }

    player.skip();

    return message.reply({
      content: `Skipped to **${player.queue[0]?.title}** by **${player.queue[0]?.author}**`,
    });
  }

  disconnect(message: Message) {
    const player = this.getPlayer(message);

    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }

    player.destroy();

    return message.reply('Disconnected!');
  }

  pause(message: Message) {
    const player = this.getPlayer(message);
    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }
    player.pause(true);
    return message.reply('Paused!');
  }

  resume(message: Message) {
    const player = this.getPlayer(message);
    if (!player) {
      return message.reply(MESSAGES.NO_PLAYER_FOUND);
    }
    player.pause(false);
    return message.reply('Resumed!');
  }
}
