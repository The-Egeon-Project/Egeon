import {
  Client,
  Message as DiscordMessage,
  GatewayIntentBits,
  VoiceState,
} from 'discord.js';
import dotenv from 'dotenv';
import { Kazagumo } from 'kazagumo';
import { Connectors, NodeOption } from 'shoukaku';

import { Command, getCommand, getIsCommand } from './commands.js';
import { MESSAGES, Message, getIsValidDiscordMessage } from './messages.js';
import { PlayerHandler } from './playerHandler.js';
import { getDuration } from './utils.js';

// Load .env only if it exists (local development)
dotenv.config();

const { Guilds, GuildVoiceStates, GuildMessages, MessageContent } =
  GatewayIntentBits;

const TIMEOUT = 15;
// Determine if should use secure connection.
const isSecure = process.env.LAVALINK_SECURE === 'true';

const Nodes = [
  {
    name: process.env.LAVALINK_NAME!,
    url: process.env.LAVALINK_URL!,
    auth: process.env.LAVALINK_PASSWORD!,
    secure: isSecure,
  },
] as NodeOption[];

const client = new Client({
  intents: [Guilds, GuildVoiceStates, GuildMessages, MessageContent],
});
const kazagumo = new Kazagumo(
  {
    defaultSearchEngine: 'youtube',
    // MAKE SURE YOU HAVE THIS
    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
  },
  new Connectors.DiscordJS(client),
  Nodes,
);

client.on('clientReady', () => console.log(client.user?.tag + ' Ready!'));

kazagumo.shoukaku.on('ready', (name) =>
  console.log(`Lavalink ${name}: Ready!`),
);

kazagumo.shoukaku.on('error', (name, error) =>
  console.error(`Lavalink ${name}: Error Caught,`, error),
);

kazagumo.shoukaku.on('close', (name, code, reason) =>
  console.warn(
    `Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`,
  ),
);

kazagumo.shoukaku.on('debug', (name, info) =>
  console.debug(`Lavalink ${name}: Debug,`, info),
);

kazagumo.shoukaku.on('disconnect', (name) => {
  const players = [...kazagumo.shoukaku.players.values()].filter(
    (p) => p.node.name === name,
  );
  players.map((player) => {
    // Clean up idle timeouts when player is destroyed
    const idleTimeout = idleTimeouts.get(player.guildId);
    if (idleTimeout) {
      clearTimeout(idleTimeout);
      idleTimeouts.delete(player.guildId);
    }
    kazagumo.destroyPlayer(player.guildId);
    player.destroy();
  });
  console.warn(`Lavalink ${name}: Disconnected.`);
});

// Track alone timeout - disconnect bot if alone in voice channel for TIMEOUT seconds
const aloneTimeouts = new Map<string, NodeJS.Timeout>();

// Track idle timeout - disconnect bot if queue is empty for TIMEOUT seconds
const idleTimeouts = new Map<string, NodeJS.Timeout>();

client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
  const guildId = oldState.guild.id || newState.guild.id;
  const player = kazagumo.players.get(guildId);

  if (!player || !player.voiceId) return;

  const voiceChannel = client.channels.cache.get(player.voiceId);
  if (!voiceChannel?.isVoiceBased()) return;

  // Get members in the voice channel (excluding bots)
  const members = voiceChannel.members.filter((member) => !member.user.bot);
  const isBotAlone = members.size === 0;

  if (isBotAlone) {
    // Bot is alone, start TIMEOUT second timeout
    if (!aloneTimeouts.has(guildId)) {
      const timeout = setTimeout(() => {
        const currentPlayer = kazagumo.players.get(guildId);
        if (currentPlayer) {
          const channel = client.channels.cache.get(currentPlayer.textId!);
          if (channel?.isTextBased() && 'send' in channel) {
            channel.send(
              '👋 I disconnected because I was alone in the voice channel.',
            );
          }
          currentPlayer.destroy();
        }
        aloneTimeouts.delete(guildId);
      }, TIMEOUT * 1000);

      aloneTimeouts.set(guildId, timeout);
      console.log(`Bot alone, starting ${TIMEOUT}s disconnect timer.`);
      console.log(`Guild ${guildId}: `);
    }
  } else {
    // Someone joined, cancel the timeout if it exists
    const existingTimeout = aloneTimeouts.get(guildId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      aloneTimeouts.delete(guildId);
      console.log(`Someone joined, cancelled disconnect timer.`);
      console.log(`Guild ${guildId}: `);
    }
  }
});

// Now Playing event - fires when a new track starts
kazagumo.on('playerStart', (player, track) => {
  // Cancel idle timeout if a new track starts
  const existingIdleTimeout = idleTimeouts.get(player.guildId);
  if (existingIdleTimeout) {
    clearTimeout(existingIdleTimeout);
    idleTimeouts.delete(player.guildId);
    console.log(
      `Guild ${player.guildId}: New track started, cancelled idle disconnect timer.`,
    );
  }

  if (!player.textId) return;

  const channel = client.channels.cache.get(player.textId);
  if (channel?.isTextBased() && 'send' in channel) {
    const duration = getDuration(track.length ?? 0);
    channel.send({
      content:
        `🎶 **Now Playing:**\n` +
        `╰─ 🎵 **${track.title}**\n` +
        `╰─ 👤 *${track.author}*\n` +
        `╰─ ⏱️ Duration: ${duration || 'Unknown'}`,
    });
  }
});

// Player End event - fires when a track ends
kazagumo.on('playerEnd', (player) => {
  // Check if queue is empty
  if (player.queue.length === 0) {
    // Start 30 second timeout to disconnect
    if (!idleTimeouts.has(player.guildId)) {
      const timeout = setTimeout(() => {
        const currentPlayer = kazagumo.players.get(player.guildId);
        if (currentPlayer) {
          const channel = client.channels.cache.get(currentPlayer.textId!);
          if (channel?.isTextBased() && 'send' in channel) {
            channel.send(
              '👋 I disconnected because the queue was empty for too long.',
            );
          }
          currentPlayer.destroy();
        }
        idleTimeouts.delete(player.guildId);
      }, TIMEOUT * 1000);

      idleTimeouts.set(player.guildId, timeout);
      console.log(
        `Guild ${player.guildId}: Queue empty, starting ${TIMEOUT}s idle disconnect timer.`,
      );
    }
  }
});

client.on('messageCreate', async (discordMessage: DiscordMessage) => {
  if (!getIsValidDiscordMessage(discordMessage)) return;

  const message = discordMessage as Message;
  const isCommand = getIsCommand(message);
  const command = getCommand(message);

  if (!isCommand || !command) return;

  const playerHandler = new PlayerHandler(kazagumo);

  switch (command) {
    case Command.HAND_SHAKE:
      await message.reply(MESSAGES.HAND_SHAKE);
      break;
    case Command.PLAY:
      await playerHandler.play(message);
      break;
    case Command.DISCONNECT:
      await playerHandler.disconnect(message);
      break;
    case Command.SKIP:
      await playerHandler.skip(message);
      break;
    case Command.PAUSE:
      await playerHandler.pause(message);
      break;
    case Command.RESUME:
      await playerHandler.resume(message);
      break;
    case Command.QUEUE:
      await playerHandler.queue(message);
      break;
    case Command.HELP:
      await message.reply(MESSAGES.VALID_COMMANDS);
      break;
    default:
      await message.reply(MESSAGES.UNKNOWN_COMMAND);
  }
});

client.login(process.env.DISCORD_TOKEN);
