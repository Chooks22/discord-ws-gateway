# discord-ws-gateway

Simple and tiny implementation of Discord's Gateway using web standard APIs.

This package simply implements [gateway connections](https://discord.com/developers/docs/topics/gateway#connections)
and emits dispatch events.  
This package is not a client; there are no utilties, wrappers, caching, nor sharding.
It is meant to be a proper "low-level" library to build those features on top on.

> This package works on any runtime with `fetch` and `WebSocket` implemented, meaning
> Node.JS users need to be running version 22 or later or monkeypatch the APIs.

## Installation

```sh
$ npm i discord-ws-gateway
```

## Usage

```js
import { Client } from "discord-ws-gateway";

const BOT_TOKEN = "my-bot-token";
const USER_AGENT = "my-library";

const res = await fetch("https://discord.com/api/gateway/bot", {
  headers: [
    ["Authorization", `Bot ${BOT_TOKEN}`],
    ["User-Agent", USER_AGENT],
  ],
});

const gateway = await res.json();

const client = new Client(gateway.url, {
  token: BOT_TOKEN,
  intents: 513,
  properties: {
    os: "linux",
    device: USER_AGENT,
    browser: USER_AGENT,
  },
});

client.addEventListener("READY", (e) => {
  console.log(`Connected to gateway as ${e.d.user.username}!`);
});


```
## License

[MIT](LICENSE)
