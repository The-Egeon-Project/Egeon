import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
});

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;

  if (msg.content === '!ping') {
    msg.reply('Pong!');
  }
});

client.login(process.env.DISCORD_TOKEN);

const shutdown = () => {
  console.log('\nShutting down bot...');
  client.destroy();
  process.exit(0);
};

// Graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
