# Eukhe: a coding agent that remembers every chat

A coding agent with one endless chat as its memory, so it never loses the context of your work.

```sh
curl -fsSL https://eukhe.com/install | sh
```

## The problem

Coding agents forget. Each new session starts empty. A long session loses its start when the context is full. You tell an agent about your project, your rules and your decisions. The next day, or after a compaction, it does not know them. You tell it again, or you keep long instruction files up to date by hand.

## How Eukhe remembers

- All chats go into one log on your computer, in `~/.eukhe/chat/`. Eukhe only adds to the log.
- A compactor writes one-line summaries into a tree over the log.
- Each turn starts from a view of 64 to 128 KB: recent messages in full, older messages as summaries.
- The agent can open each summary, down to the original messages.

The design is Victor Taelin's [OptChat](https://gist.github.com/VictorTaelin/91837951a5ce5b38f341ec1ba1df6449).

## Coding

Eukhe is a full coding agent in the terminal. It reads and edits your code. It runs commands and a Python REPL. It starts subagents that work in parallel and send messages to each other. It works with hosted models and with local models.

## Your agent on your phone

`eukhe gateway` connects Signal on your phone to the session in your terminal. Send a message: the agent does the work on your computer and replies in Signal. `eukhe dashboard` shows the chat, the running work and the memory in a browser. Eukhe can replace Hermes Agent as a gateway and for automation, with the same memory as your coding sessions.

## Install

Eukhe runs on macOS (Apple Silicon) and Linux. Use the command at the top of this page. It checks each download against the release checksums.

Or use Nix:

```sh
nix run github:gildrb/eukhe
```

Nix users can also use the Home Manager module. mise users can add `"github:gildrb/eukhe" = { version = "latest", version_prefix = "eukhe-v" }` to `[tools]`. The source code is on [GitHub](https://github.com/gildrb/eukhe).

Eukhe runs commands from the model with the permissions of your user. It is not a sandbox. Use it only with repositories that you trust.

## Questions

### Does my chat go to a server?

The chat log stays on your computer. The model provider that you select receives the view of each turn, as with all agents.

### Where does Eukhe come from?

Eukhe is a fork of [Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent) by Prime Intellect, under the MIT license. Eukhe is not affiliated with Prime Intellect.
