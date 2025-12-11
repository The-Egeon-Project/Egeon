import { Message } from './messages';

export enum Command {
  HAND_SHAKE = 'handshake',
  PLAY = 'play',
  SKIP = 'skip',
  STOP = 'stop',
  PAUSE = 'pause',
  RESUME = 'resume',
  DISCONNECT = 'disconnect',
  // TODOD: Implement following commands
  QUEUE = 'queue',
  HELP = 'help',
}

export const COMMANDS_ALIASES: Record<string, Command> = {
  hs: Command.HAND_SHAKE,
  p: Command.PLAY,
  sk: Command.SKIP,
  s: Command.STOP,
  pa: Command.PAUSE,
  re: Command.RESUME,
  ds: Command.DISCONNECT,
  h: Command.HELP,
  '?': Command.HELP,
  q: Command.QUEUE,
} as const;

export function getIsCommand(message: Message) {
  return message.content.startsWith('!');
}

function normalizeCommand(command: string) {
  const normalizedCommand = COMMANDS_ALIASES[command];
  return normalizedCommand || (command as Command);
}

export function getCommand(message: Message): Command | null {
  const [_, suffix] = message.content.split('!');

  if (suffix === undefined || suffix === null || suffix === '') {
    return null;
  }
  const [rawCommand, ..._args] = suffix.split(' ');

  if (rawCommand === '' || rawCommand === undefined) {
    return null;
  }

  const command = normalizeCommand(rawCommand);

  return command;
}
