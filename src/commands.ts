import { Message } from './messages.js';

export enum Command {
  HAND_SHAKE = 'handshake',
  PLAY = 'play',
  PLAY_NEXT = 'playnext',
  SKIP = 'skip',
  PAUSE = 'pause',
  RESUME = 'resume',
  DISCONNECT = 'disconnect',
  QUEUE = 'queue',
  HELP = 'help',
}

export const COMMANDS_ALIASSES: Record<string, Command> = {
  hs: Command.HAND_SHAKE,
  p: Command.PLAY,
  pn: Command.PLAY_NEXT,
  sk: Command.SKIP,
  pa: Command.PAUSE,
  re: Command.RESUME,
  ds: Command.DISCONNECT,
  h: Command.HELP,
  '?': Command.HELP,
  q: Command.QUEUE,
} as const;

const keys = Object.values(COMMANDS_ALIASSES);

export const ALIASES_FOR_COMMANDS = keys.reduce(
  (acc, key) => {
    const aliasses = Object.entries(COMMANDS_ALIASSES)
      .map(([alias, value]) => (value === key ? alias : null))
      .filter((alias) => alias !== null);

    acc[key] = aliasses;

    return acc;
  },
  {} as Record<string, string[]>,
);

export const COMMANDS_DESCRIPTIONS: Record<Command, string> = {
  [Command.HAND_SHAKE]: 'Am I alive? Say hi and find out! 👋',
  [Command.PLAY]: 'Play a song or add it to the queue 🎶',
  [Command.PLAY_NEXT]:
    'Add a song or playlist next in the queue without interrupting playback: !playnext <query> ⏭️',
  [Command.SKIP]: 'Skip to the next song ⏭️',
  [Command.PAUSE]: 'Pause the music for a bit ⏸️',
  [Command.RESUME]: 'Resume the music where you left off ▶️',
  [Command.DISCONNECT]: 'Kick me out of the voice channel 👋😢',
  [Command.QUEUE]: 'Check out what songs are in the queue 📋',
  [Command.HELP]: 'Show this help message 📖',
};

export function getIsCommand(message: Message) {
  return message.content.startsWith('!');
}

function normalizeCommand(command: string) {
  const normalizedCommand = COMMANDS_ALIASSES[command];
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
