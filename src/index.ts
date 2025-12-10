import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { Kazagumo } from 'kazagumo';
import { Connectors, NodeOption } from 'shoukaku';

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

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  if (
    message.content.startsWith('!p ') ||
    message.content.startsWith('!play ')
  ) {
    const args = message.content.split(' ');
    const query = args.slice(1).join(' ');

    const { channel } = message.member.voice;
    if (!channel)
      return message.reply(
        'You need to be in a voice channel to use this command!',
      );

    let player = await kazagumo.createPlayer({
      guildId: message.guild.id,
      textId: message.channel.id,
      voiceId: channel.id,
    });

    let result = await kazagumo.search(query, { requester: message.author });
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

  if (message.content.startsWith('!skip')) {
    let player = kazagumo.players.get(message.guild.id);
    if (!player) return message.reply('No player found!');
    player.skip();
    console.log(message.guild.id);

    return message.reply({
      content: `Skipped to **${player.queue[0]?.title}** by **${player.queue[0]?.author}**`,
    });
  }

  if (
    message.content.startsWith('!forceplay') ||
    message.content.startsWith('!fp')
  ) {
    let player = kazagumo.players.get(message.guild.id);
    if (!player) return message.reply('No player found!');
    const args = message.content.split(' ');
    const query = args.slice(1).join(' ');
    let result = await kazagumo.search(query, { requester: message.author });
    const track = result.tracks[0];

    if (!track) return message.reply('No results found!');

    player.play(track);

    return message.reply({
      content: `Forced playing **${track.title}** by **${track.author}**`,
    });
  }

  if (message.content.startsWith('!previous')) {
    let player = kazagumo.players.get(message.guild.id);
    if (!player) return message.reply('No player found!');
    const previous = player.getPrevious(); // we get the previous track without removing it first
    if (!previous) return message.reply('No previous track found!');
    await player.play(player.getPrevious(true)); // now we remove the previous track and play it
    return message.reply('Previous!');
  }

  if (
    message.content.startsWith('!pause') ||
    message.content.startsWith('!stop')
  ) {
    let player = kazagumo.players.get(message.guild.id);
    if (!player) return message.reply('No player found!');
    player.pause(true);

    return message.reply('Paused!');
  }

  if (
    message.content.startsWith('!resume') ||
    message.content.startsWith('!unpause')
  ) {
    let player = kazagumo.players.get(message.guild.id);
    if (!player) return message.reply('No player found!');
    player.pause(false);
    return message.reply('Resumed!');
  }
});

client.login(process.env.DISCORD_TOKEN);
