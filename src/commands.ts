import { Message } from 'discord.js';

export enum Command {
  HAND_SHAKE = 'hs',
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

function normalizeCommand(command: string) {
  return command as Command;
}

export function getCommand(message: Message): Command | null {
  const [_, rawCommand, ..._args] = message.content.split('!');

  if (rawCommand === '' || rawCommand === undefined) {
    return null;
  }

  const command = normalizeCommand(rawCommand);

  return command;
}
