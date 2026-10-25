# Poros: open a dev server that runs on your server, on your Mac or phone

## Dev servers on every device

Open the dev server of your server on your Mac or phone, through a private HTTPS link on your Tailscale network.

```sh
curl -fsSL https://poros.gildrb.com/install | bash
```

## Out of reach

The dev server listens on `localhost` of the server, so your laptop and phone cannot reach it. An SSH tunnel stops when the connection drops. A public tunnel puts unfinished work on the internet.

## One command

Put `poros` before your dev command:

```sh
poros vp dev
```

Poros finds the port and gives it a private HTTPS link on your tailnet, through Tailscale Serve. Hot reload works, and Vite needs no configuration. The link goes away when the command stops. `poros dashboard` shows all your dev servers.

## Setup

Poros runs on macOS and Linux. It needs Tailscale on both devices, MagicDNS and HTTPS certificates on for the tailnet, and access rules that allow the HTTPS port. Only devices of your tailnet can open the link.
