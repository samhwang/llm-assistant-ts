import { Client, GatewayIntentBits, Partials } from 'discord.js';

export type ClientOptions = {
  token?: string;
};

export function getClient(options: ClientOptions): Promise<Client> {
  if (!options.token) throw new Error('please setup bot token');

  return new Promise((resolve, reject) => {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.Reaction],
    });
    client
      .on('ready', () => resolve(client))
      .on('error', reject)
      .login(options.token);
  });
}
