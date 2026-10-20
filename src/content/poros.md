# Poros: open a dev server that runs on your server, on your Mac or phone

Your code builds on a server, a desktop or a VM, but you want to see the page on your laptop or phone. Poros gives the dev server a private HTTPS link on your Tailscale network. No port forwarding, no SSH tunnel, no public URL. [GitHub](https://github.com/gildrb/poros)

```sh title="Run your usual dev command through Poros"
poros vp dev
```

## The problem

Frontend work on a remote machine is slow to set up. The dev server listens on `localhost` of the server, so your browser cannot reach it. SSH tunnels break when the connection drops. A public tunnel puts unfinished work on the internet. Vite and other dev servers refuse unknown hosts, and phones need HTTPS for many browser features.

## What Poros does

- Starts your command, for example `vp dev`, `bun dev`, `npm run dev` or `next dev`.
- Finds the port the dev server listens on.
- Gives it a private HTTPS address on your tailnet, through Tailscale Serve. Never Funnel: nothing goes to the public internet.
- Forwards requests and WebSockets with the local `Host`, so hot reload works and Vite needs no configuration.
- Removes the route when the command stops.

Open the link on any device of your tailnet: Mac, iPhone, iPad or another computer. Your code, builds and dev server stay on the development machine.

## Install

```sh
curl -fsSL https://poros.gildrb.com/install | bash
```

With Nix: `nix profile install github:gildrb/poros`. The flake also has NixOS, nix-darwin and Home Manager modules. Poros runs on macOS and Linux.

## Requirements

- Tailscale on the development machine and on the device you view from.
- MagicDNS and HTTPS certificates on for the tailnet.
- Access rules that allow the HTTPS port.

## See every dev server

`poros dashboard` lists every TCP server your user runs, with its HTTPS link, folder and command. Stop one with `x`.

## Questions

### How do I open localhost of a remote server on my phone?

Run the dev command through Poros on the server, for example `poros vp dev`. It prints an HTTPS link. Open it on the phone. The phone must be on the same tailnet.

### Is the site public?

No. Only devices of your tailnet that its access rules allow can open it. Tailscale records certificate names in public Certificate Transparency logs, but the site stays private.

### How is this different from an SSH tunnel or ngrok?

An SSH tunnel needs one open SSH session per port and per device. ngrok and Tailscale Funnel publish the site to the internet. Poros needs no session and publishes nothing.
