# Eukhe: a coding agent that remembers every chat

Coding agents forget. Each new session starts empty, and a long session loses its start when the context fills up. Eukhe keeps one endless chat as its memory: every turn starts from a compact view of everything you did together. [GitHub](https://github.com/gildrb/eukhe)

```sh title="Install on macOS (Apple Silicon) or Linux"
curl -fsSL https://eukhe.com/install | sh
```

## The problem

You explain your project, your rules and your decisions to an agent. The next day, or after a compaction, it knows none of it. You explain again, or you keep long instruction files up to date by hand.

## How Eukhe remembers

- All chats go into one append-only log on your computer, in `~/.eukhe/chat/`.
- A compactor writes one-line summaries into a tree over the log.
- Each turn starts from a view of about 64 to 128 KB: recent messages in full, older ones as summaries.
- The agent can open any summary down to the original messages.

The design is Victor Taelin's [OptChat](https://gist.github.com/VictorTaelin/91837951a5ce5b38f341ec1ba1df6449).

## Coding

Eukhe is a full coding agent in the terminal: it reads and edits your code, runs commands and a Python REPL, and spawns subagents that work in parallel and message each other. It works with hosted models and with your own local models.

## A gateway to your agent

`eukhe gateway` connects Signal on your phone to the same session as your terminal. Send a message, and the agent works on your computer and replies in Signal. `eukhe dashboard` shows the chat, the running work and the memory in a browser. If you use Hermes Agent as a gateway and for automation, Eukhe does that job too, and it is a coding agent with the same memory.

## Install

- curl: `curl -fsSL https://eukhe.com/install | sh`. It checks each download against the release checksums.
- Nix: `nix run github:gildrb/eukhe`, or the Home Manager module.
- mise: `"github:gildrb/eukhe" = { version = "latest", version_prefix = "eukhe-v" }`.

Eukhe runs model-generated commands with your user's permissions. It is not a sandbox. Use it with repositories you trust.

## Questions

### Is my chat sent anywhere?

The chat log stays on your computer. The model provider you choose receives each turn's view, as with any agent.

### Where does Eukhe come from?

It is a fork of [Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent) by Prime Intellect, MIT licensed. Eukhe is not affiliated with Prime Intellect.
