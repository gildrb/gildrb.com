# Poros: open a dev server that runs on your server, on your Mac or phone

You build on a server, a desktop or a VM. You want to see the page on your laptop or phone. Poros gives the dev server a private HTTPS link on your Tailscale network. You need no port forward, no SSH tunnel and no public URL.

```sh
curl -fsSL https://poros.gildrb.com/install | bash
```

## The problem

The dev server listens on `localhost` of the server. Your browser cannot reach it. An SSH tunnel stops when the connection drops. A public tunnel puts unfinished work on the internet. Vite and other dev servers refuse unknown hosts. Phones need HTTPS for many browser features.

## What Poros does

- It starts your command, for example `vp dev`, `bun dev`, `npm run dev` or `next dev`.
- It finds the port of the dev server.
- It gives that port a private HTTPS address on your tailnet, through Tailscale Serve. It never uses Funnel: nothing goes to the public internet.
- It forwards requests and WebSockets with the local `Host`. Hot reload works, and Vite needs no configuration.
- It removes the route when the command stops.

Open the link on a device of your tailnet: Mac, iPhone, iPad or a different computer. Your code and the dev server stay on the development machine.

## Use

Put `poros` before your dev command:

```sh
poros vp dev
```

To see all dev servers, run `poros dashboard`. It shows each TCP server of your user, with its HTTPS link, folder and command. Press `x` to stop a server.

## Install

Poros runs on macOS and Linux. Use the command at the top of this page, or Nix:

```sh
nix profile install github:gildrb/poros
```

The flake also has NixOS, nix-darwin and Home Manager modules. The source code is on [GitHub](https://github.com/gildrb/poros).

## Requirements

- Tailscale on the development machine and on the device that you view from.
- MagicDNS and HTTPS certificates on for the tailnet.
- Access rules that allow the HTTPS port.

## Questions

### How do I open localhost of a remote server on my phone?

On the server, run the dev command through Poros, for example `poros vp dev`. It shows an HTTPS link. Open the link on the phone. The phone must be on the same tailnet.

### Is the site public?

No. Only devices of your tailnet that its access rules allow can open it. Tailscale writes the certificate names to public Certificate Transparency logs. The site stays private.

### How is Poros different from an SSH tunnel or ngrok?

An SSH tunnel needs one open SSH session for each port and each device. ngrok and Tailscale Funnel put the site on the internet. Poros needs no session and puts nothing on the internet.
