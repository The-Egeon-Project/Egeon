import {
  Client,
  Message as DiscordMessage,
  GatewayIntentBits,
} from 'discord.js';
import dotenv from 'dotenv';
import { Kazagumo } from 'kazagumo';
import { Connectors, NodeOption } from 'shoukaku';

import { Command, getCommand, getIsCommand } from './commands';
import { MESSAGES, Message, getIsValidDiscordMessage } from './messages';
import { PlayerHandler } from './playerHandler';

// Load .env only if it exists (local development)
dotenv.config();

const { Guilds, GuildVoiceStates, GuildMessages, MessageContent } =
  GatewayIntentBits;

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

kazagumo.shoukaku.on('disconnect', (name, count) => {
  const players = [...kazagumo.shoukaku.players.values()].filter(
    (p) => p.node.name === name,
  );
  players.map((player) => {
    kazagumo.destroyPlayer(player.guildId);
    player.destroy();
  });
  console.warn(`Lavalink ${name}: Disconnected`);
});

client.on('messageCreate', async (discordMessage: DiscordMessage) => {
  const isValidDiscordMessage = getIsValidDiscordMessage(discordMessage);
  if (!isValidDiscordMessage) return;

  const message = discordMessage as Message;
  const isCommand = getIsCommand(message);
  const command = getCommand(message);

  if (!isCommand || !command) return;
  const playerHandler = new PlayerHandler(kazagumo);

  switch (command) {
    case Command.HAND_SHAKE:
      return message.reply('Hi!'); //Just health check status of the bot.
    case Command.PLAY:
      return playerHandler.play(message);
    case Command.DISCONNECT:
      return playerHandler.disconnect(message);
    case Command.SKIP:
      return playerHandler.skip(message);
    case Command.PAUSE:
      return playerHandler.pause(message);
    case Command.RESUME:
      return playerHandler.resume(message);
    default:
      return message.reply(MESSAGES.UNKNOWN_COMMAND);
  }
});

client.login(process.env.DISCORD_TOKEN);
