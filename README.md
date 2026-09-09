# tone-indicator-bot
Tony the Tone Indicator is a Discord bot dedicated to reformatting messages that use tone indicators. Tone indicators are automatically converted to colored code text blocks.

## Run the bot locally

### Prerequisites

- Node.js 18 or newer
- A Discord account and a server where you can manage bots

### 1. Create a Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Open the **Bot** page, create a bot, and copy its token.
3. On the **Bot** page, enable **Message Content Intent** under **Privileged Gateway Intents**.
4. Copy the **Application ID** from the **General Information** page.
5. Use the OAuth2 URL generator to invite the bot to your server with the `bot` and `applications.commands` scopes. Grant it these permissions:
	 - View Channels
	 - Send Messages
	 - Manage Messages
	 - Manage Webhooks
	 - Read Message History

### 2. Install and configure the project

Clone this repository and install its dependencies:

```sh
git clone https://github.com/m0rdhai/tone-indicator-bot.git
cd tone-indicator-bot
npm install
```

Create a `config.json` file in the project root with your bot token and application ID:

```json
{
	"token": "your-discord-bot-token",
	"clientId": "your-application-id"
}
```

Keep the token private and do not commit it to source control. If the token is exposed, regenerate it from the **Bot** page in the Discord Developer Portal.

### 3. Start the bot

Run the bot from the project directory:

```sh
node index.js
```

When startup succeeds, the terminal prints a `Ready!` message and registers the slash commands. Keep this process running while you use the bot.

## Using the bot

Write a message containing a tone indicator such as `/j` or `/s`. Tony deletes the original message and reposts it as a colored ANSI code block using a webhook.

- `/tonyhelp` displays the available tone indicators.
- `/tonyset` changes the color for one of your tone indicators.

The bot stores per-user color settings in `userSettings.json`.
