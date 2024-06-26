import { DiscordSDK } from "@discord/embedded-app-sdk";
import rocketLogo from '/rocket.png';
import "./style.css";

// Variable to store the authenticated user's access token
let auth;

// Initialize Discord SDK with the client ID
const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

// Set up the Discord SDK and perform initial actions
setupDiscordSdk().then(() => {
    console.log("Discord SDK is authenticated");

    // Perform actions that require authentication
    appendVoiceChannelName();
    // appendGuildAvatar(); // Commented out, can be enabled if needed
    appendUserAvatars();
});

// Function to set up and authenticate the Discord SDK
async function setupDiscordSdk() {
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
        ],
    });

    // Exchange the code for an access token
    const response = await fetch("/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
    });
    const { access_token } = await response.json();

    // Authenticate with the Discord client using the access token
    auth = await discordSdk.commands.authenticate({ access_token });

    if (auth == null) {
        throw new Error("Authenticate command failed");
    }
}

// Function to append the current voice channel name to the UI
async function appendVoiceChannelName() {
    const app = document.querySelector('#app');
    let activityChannelName = 'Unknown';

    // Fetch channel information if available
    if (discordSdk.channelId != null && discordSdk.guildId != null) {
        const channel = await discordSdk.commands.getChannel({channel_id: discordSdk.channelId});
        if (channel.name != null) {
            activityChannelName = channel.name;
        }
    }

    // Update the UI with the channel name
    const textTag = document.createElement('p');
    textTag.textContent = `Activity Channel: "${activityChannelName}"`;
    app.appendChild(textTag);
}

// Function to append the current guild's avatar to the UI
async function appendGuildAvatar() {
    const app = document.querySelector('#app');

    // Fetch user's guilds from Discord API
    const guildsResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
        headers: {
            Authorization: `Bearer ${auth.access_token}`,
            'Content-Type': 'application/json',
        },
    });

    console.log("Guilds response status:", guildsResponse.status);
    console.log("Guilds response headers:", guildsResponse.headers);

    const guilds = await guildsResponse.json();
    console.log("guilds:", guilds);

    // Find the current guild's info
    const currentGuild = guilds.find((g) => g.id === discordSdk.guildId);
    console.log("currentGuild:", currentGuild);

    // Append guild avatar to the UI
    if (currentGuild != null) {
        console.log("Guild icon:", currentGuild.icon);

        const guildImg = document.createElement('img');
        guildImg.setAttribute(
            'src',
            currentGuild.icon !== null
                ? `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.webp?size=128`
                : 'default_icon.png'
        );
        guildImg.setAttribute('width', '128px');
        guildImg.setAttribute('height', '128px');
        guildImg.setAttribute('style', 'border-radius: 50%;');
        app.appendChild(guildImg);
    } else {
        console.error("Current guild not found in the list of guilds.");
    }
}

// Function to append avatars of users in the current voice channel
async function appendUserAvatars() {
    const app = document.querySelector('#app');

    // Get information about the current channel
    const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId });

    if (!channel) {
        console.error("Channel not found.");
        return;
    }

    console.log("Channel:", channel);

    // Filter users who are in the voice channel
    const voiceChannelUsers = channel.voice_states.filter(state => state.user);

    console.log("Voice Channel Users:", voiceChannelUsers);

    // Add avatars of users to the UI
    for (const user of voiceChannelUsers) {
        const userAvatarUrl = `https://cdn.discordapp.com/avatars/${user.user.id}/${user.user.avatar}.png`;

        const userImg = document.createElement('img');
        userImg.setAttribute('src', userAvatarUrl);
        userImg.setAttribute('alt', user.user.username);
        userImg.setAttribute('width', '48px');
        userImg.setAttribute('height', '48px');
        userImg.setAttribute('style', 'border-radius: 50%; margin-right: 5px;');
        app.appendChild(userImg);
    }
}

// Set up the initial HTML content
document.querySelector('#app').innerHTML = `
  <div>
    <img src="${rocketLogo}" class="logo" alt="Discord" />
    <h1>Hello, World!</h1>
  </div>
`;