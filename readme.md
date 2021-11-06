# DiscordBot 📻

### Who? 🤔
DiscordBot (aka DJ bala) is a music bot made for discord using [Discord.js](https://discord.js.org/#/docs/main/stable/general/welcome). DJ bala supports slash commands and can play songs given the url, name or playlist link. My boy even sends messages to the chat in embed form. 

### Commands ✔️
Currently, this are the supported commands:
* `/play <song>` Plays the given **url**, **song name** or **playlist link**
* `/skip` Skips current song
* `/stop` Stops the bot
* `/pause` Pauses current song
* `/resume` Unpauses current song
* `/ping` Shows bot latency

### Deployment 🛩️
We use [heroku](https://discordbot-paredao.herokuapp.com) to host our bot. Keep in mind worker nodes work a lot and might bite you later.

### Does it work tho? 🏫
Ye. You can't see him tho, he goes to another school.

### Create your own! 📝
I started this project using Discord.js v12, i.e. I followed this [tutorial](https://gabrieltanner.org/blog/dicord-music-bot). As I'm writing this, v12 has been deprecated but the dispatcher logic in this tutorial is very helpful. 

### For local development 💻
If you want to run this project you can use the following command to run the bot with a local `.env` file: `npm start`. 
* **`DISCORD_KEY`** is your bot token (see the [developer](https://discord.com/developers/applications) portal)
* **`GUILD_ID`** is the ID of your server.

### Special thanks ❤️
As always, thank you for reading and thank you my friends for helping me improve DJ bala! 
