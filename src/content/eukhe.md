# Eukhe: a coding agent that remembers every chat

## Context that lasts

A coding agent with one endless chat as its memory, so it never loses the context of your work.

```sh
curl -fsSL https://eukhe.com/install | sh
```

## Agents forget

Each new session starts empty. A long session loses its start when the context is full. You tell the agent your rules again, or you keep instruction files up to date by hand.

## One endless chat

All chats go into one log on your computer. A compactor writes one-line summaries into a tree over the log. Each turn starts from recent messages in full and older ones as summaries. The agent can open any summary down to the original messages. The design is Victor Taelin's [OptChat](https://gist.github.com/VictorTaelin/91837951a5ce5b38f341ec1ba1df6449).

Eukhe reads and edits code, runs commands and starts subagents. `eukhe gateway` connects Signal on your phone to the same session.

## Install

Eukhe runs on macOS (Apple Silicon) and Linux. Use the command at the top of this page, or Nix:

```sh
nix run github:gildrb/eukhe
```

Eukhe runs model commands with the permissions of your user. It is not a sandbox. Eukhe is a fork of [Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent) and is not affiliated with Prime Intellect.
