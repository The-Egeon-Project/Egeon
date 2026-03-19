import { Message as DiscordMessage } from 'discord.js';

import {
  ALIASES_FOR_COMMANDS,
  COMMANDS_ALIASSES,
  COMMANDS_DESCRIPTIONS,
  Command,
} from './commands.js';

// Dictionary of common messages.
export const MESSAGES = {
  NO_PLAYER_FOUND:
    "🤔 Hmm... there's no active player. Start playing something with `!play` first!",
  NO_VOICE_CHANNEL_FOUND:
    '🎤 Hey! Join a voice channel first so I can rock out with you 🎸',
  NO_TRACK_FOUND:
    "😕 Couldn't find anything with that... Try a different search?",
  UNKNOWN_COMMAND:
    "❌ Oops, I don't know that command. Type `!help` to see what I can do 😉",
  EMPTY_QUEUE:
    '🦗 *crickets*... The queue is empty. Add something with `!play`!',
  NO_SONGS_IN_QUEUE_TO_SKIP:
    '🤷 No more songs in the queue to skip to. This is the last one!',
  VALID_COMMANDS:
    '🎵 **Here are all my commands!** 🎵\n\n' +
    `${Object.values(Command)
      .map(
        (command) =>
          `🎧 \`!${command}\`\n` +
          `╰─ ${COMMANDS_DESCRIPTIONS[command]}\n` +
          `${ALIASES_FOR_COMMANDS[command] ? '╰─ 🏷️ *Shortcuts:* ' + ALIASES_FOR_COMMANDS[command].map((alias) => `\`!${alias}\``).join(', ') + '\n' : ''}`,
      )
      .join('\n')}` +
    '\n💡 *Tip: Use shortcuts to type faster*',
  HAND_SHAKE:
    "👋 Hey there! Everything's running smoothly. Ready to play some tunes? 🎵",
  DISCONNECTED:
    '👋 Bye bye! Disconnected from the channel. Call me when you want more music! 🎵',
  RESUMED: "▶️ Let's keep the music going! 🎉🎵",
  PAUSED: '⏸️ Music paused. Hit `!resume` when you want to continue 🎧',
};

type NotNull<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

export type Message = NotNull<DiscordMessage>;

export function getIsValidDiscordMessage(discordMessage: DiscordMessage) {
  return !discordMessage.author.bot && discordMessage.inGuild();
}
