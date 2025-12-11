import { Message } from 'discord.js';

export enum Command {
  PLAY = 'play',
  SKIP = 'skip',
  STOP = 'stop',
  PAUSE = 'pause',
  RESUME = 'resume',
  PREVIOUS = 'previous',
  NEXT = 'next',
  HELP = 'help',
  INFO = 'info',
  QUEUE = 'queue',
  NOWPLAYING = 'nowplaying',
}

export function getIsCommand(message: Message) {
  return message.content.startsWith('!');
}

export function getCommand(message: Message): Command | null {
  const [_, command] = message.content.split('!');

  return (command as Command) || null;
}
