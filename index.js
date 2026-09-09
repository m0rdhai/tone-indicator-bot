const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { token, clientId } = require("./config.json");
const TONES = require("./tones.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// color keywords to ANSI codes
const COLOR_MAP = {
  gray: "0;30",
  red: "0;31",
  green: "0;32",
  yellow: "0;33",
  blue: "0;34",
  magenta: "0;35",
  cyan: "0;36",
  white: "0;37",
};

// save user settings in a JSON file
const SETTINGS_FILE = path.join(__dirname, "userSettings.json");

function loadUserSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  }
  catch (err) {
    console.error("Error loading userSettings.json:", err);
    return {};
  }
}

function saveUserSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
  }
  catch (err) {
    console.error("Error saving userSettings.json:", err);
  }
}

const userSettings = loadUserSettings();

function getUserToneCode(userId, toneKey) {
  if (userSettings[userId] && userSettings[userId][toneKey]) {
    return userSettings[userId][toneKey];
  }
  return TONES[toneKey]?.code ?? "0;37";
}

// slash command definitions
const commands = [
  new SlashCommandBuilder()
    .setName("tonyhelp")
    .setDescription(
      "Show a list of all Tone Indicators and their descriptions, along with usage instructions",
    ),

  new SlashCommandBuilder()
    .setName("tonyset")
    .setDescription("Change the color of your Tone Indicator messages or reset to default")
    .addStringOption((option) =>
      option
        .setName("tone")
        .setDescription("The tone indicator you want to change the color for (e.g., j, s, etc.)")
        .setRequired(true)
        .addChoices(
          ...Object.keys(TONES).map((key) => ({
            name: `${key}`,
            value: key,
          })),
        ),
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Choose a color or reset it to default")
        .setRequired(true)
        .addChoices(
          { name: "red", value: "red" },
          { name: "green", value: "green" },
          { name: "yellow", value: "yellow" },
          { name: "blue", value: "blue" },
          { name: "magenta", value: "magenta" },
          { name: "cyan", value: "cyan" },
          { name: "white", value: "white" },
          { name: "gray", value: "gray" },
          { name: "default", value: "default" },
        ),
    ),
].map((cmd) => cmd.toJSON());

// register slash commands with Discord API
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Slash commands registered successfully.");
  }
  catch (error) {
    console.error("Error registering slash commands:", error);
  }
}

// regex and colorize
const TONE_KEYS = Object.keys(TONES).sort((a, b) => b.length - a.length);
const TONE_REGEX = new RegExp(
  `(?:^|\\s)\\/(${TONE_KEYS.join("|")})(?=$|\\s|[.,!?;:])`,
  "i",
);

function colorizeMessage(message, code) {
  const colored = message
    .split("\n")
    .map((line) => `\u001b[${code}m${line}\u001b[0m`)
    .join("\n");
  return "```ansi\n" + colored + "\n```";
}

const webhookCache = new Map();

async function getWebhook(channel) {
  if (webhookCache.has(channel.id)) return webhookCache.get(channel.id);

  const existing = await channel.fetchWebhooks().catch(() => null);
  let webhook = existing?.find((wh) => wh.name === "Tone Indicator Relay");

  if (!webhook) {
    webhook = await channel
      .createWebhook({ name: "Tone Indicator Relay" })
      .catch((err) => {
        console.error(
          `Could not create webhook in #${channel.name}:`,
          err.message,
        );
        return null;
      });
  }

  if (webhook) webhookCache.set(channel.id, webhook);
  return webhook;
}

// interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "tonyhelp") {
    const embed = new EmbedBuilder()
      .setTitle("Tone Indicators — Guide")
      .setDescription(
        "Write the abbreviation (e.g., `/j` or `/s`) anywhere in your message to format it with the corresponding Tone Indicator.\n\n" +
          "**Set your own colors:**\n" +
          "Use the `/tonyset` command to customize the color of your messages (e.g., `/tonyset tone:j color:red`).",
      )
      .setColor(0x3498db);

    Object.entries(TONES).forEach(([key, tone]) => {
      embed.addFields({
        name: `/${key} — ${tone.label}`,
        value: tone.description,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  else if (commandName === "tonyset") {
    const toneKey = interaction.options.getString("tone").toLowerCase();
    const selectedColor = interaction.options.getString("color").toLowerCase();

    if (!userSettings[interaction.user.id]) {
      userSettings[interaction.user.id] = {};
    }

    if (selectedColor === "default") {
      delete userSettings[interaction.user.id][toneKey];
      saveUserSettings(userSettings);
      await interaction.reply({
        content: `The color for **/${toneKey}** has been reset to the default value.`,
        ephemeral: true,
      });
    }
    else {
      const ansiCode = COLOR_MAP[selectedColor];
      userSettings[interaction.user.id][toneKey] = ansiCode;
      saveUserSettings(userSettings);

      await interaction.reply({
        content: `The color for **/${toneKey}** has been successfully changed to **${selectedColor}**!`,
        ephemeral: true,
      });
    }
  }
});

// message handler
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.webhookId) return;
  if (!message.guild) return;

  const match = message.content.match(TONE_REGEX);
  if (!match) return;

  const toneKey = match[1].toLowerCase();
  const tone = TONES[toneKey];
  if (!tone) return;

  const channel = message.channel;
  const webhook = await getWebhook(channel);
  if (!webhook) return;

  const canDelete = channel
    .permissionsFor(message.guild.members.me)
    ?.has("ManageMessages");
  if (!canDelete) return;

  const displayName = message.member?.displayName ?? message.author.username;
  const avatarURL = message.author.displayAvatarURL();
  const globalToneRegex = new RegExp(TONE_REGEX.source, "gi");
  const cleanedText = message.content
    .replace(globalToneRegex, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!cleanedText && message.attachments.size === 0) return;

  const userCode = getUserToneCode(message.author.id, toneKey);
  const content = colorizeMessage(cleanedText, userCode);

  try {
    await message.delete();
    await webhook.send({
      content,
      username: displayName,
      avatarURL,
      threadId: channel.isThread() ? channel.id : undefined,
      files: [...message.attachments.values()],
      allowedMentions: { parse: [] },
    });
  }
  catch (err) {
    console.error("Failed to transform message:", err.message);
  }
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  await registerCommands();
});

client.login(token);
