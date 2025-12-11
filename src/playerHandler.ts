import { Message } from 'discord.js';
import { Kazagumo, KazagumoPlayer } from 'kazagumo';

import { MESSAGES } from './messages';

export class PlayerHandler {
  constructor(private readonly kazagumo: Kazagumo) {
    this.kazagumo = kazagumo;
  }

  getPlayer(message: Message): KazagumoPlayer | undefined {
    return this.kazagumo.players.get(message.guild!.id);
  }

  handleMessage(message: Message) {
    if (!message.guild) return;
    if (!message.member) return;
    if (!message.member.voice.channel) return;
    if (!message.member.voice.channel.id) return;
    if (!message.member.voice.channel.id) return;
  }

  handleNoPlayerFound(message: Message) {
    return message.reply('No player found!');
  }

  skip(message: Message) {
    this.handleMessage(message);

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

  // if (
  //   message.content.startsWith('!forceplay') ||
  //   message.content.startsWith('!fp')
  // ) {
  //   let player = kazagumo.players.get(message.guild.id);
  //   if (!player) return message.reply('No player found!');
  //   const args = message.content.split(' ');
  //   const query = args.slice(1).join(' ');
  //   let result = await kazagumo.search(query, { requester: message.author });
  //   const track = result.tracks[0];

  //   if (!track) return message.reply('No results found!');

  //   player.play(track);

  //   return message.reply({
  //     content: `Forced playing **${track.title}** by **${track.author}**`,
  //   });
  // }

  // if (message.content.startsWith('!previous')) {
  //   let player = kazagumo.players.get(message.guild.id);
  //   if (!player) return message.reply('No player found!');
  //   const previous = player.getPrevious(); // we get the previous track without removing it first
  //   if (!previous) return message.reply('No previous track found!');
  //   await player.play(player.getPrevious(true)); // now we remove the previous track and play it
  //   return message.reply('Previous!');
  // }

  // if (
  //   message.content.startsWith('!pause') ||
  //   message.content.startsWith('!stop')
  // ) {
  //   let player = kazagumo.players.get(message.guild.id);
  //   if (!player) return message.reply('No player found!');
  //   player.pause(true);

  //   return message.reply('Paused!');
  // }

  // if (
  //   message.content.startsWith('!resume') ||
  //   message.content.startsWith('!unpause')
  // ) {
  //   let player = kazagumo.players.get(message.guild.id);
  //   if (!player) return message.reply('No player found!');
  //   player.pause(false);
  //   return message.reply('Resumed!');
  // }
}
