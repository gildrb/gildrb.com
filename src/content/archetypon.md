# Archetypon: convert SVG to PNG, ICO, WebP, JPEG and PDF

Archetypon is free and open source. [GitHub](https://github.com/gildrb/archetypon)

## The problem

A logo or icon needs many files: favicons, app icons, PNGs for slides, a PDF for print, WebP for the web. Exporting each size by hand from a design tool takes time, and each export is a chance to get a size or a background wrong.

## What you get

- Optimized SVG.
- PNG, WebP and JPEG at every size you choose, from 16 to 4096 pixels.
- A multi-size ICO favicon.
- A vector PDF.
- A transparent or an opaque background, and the JPEG quality you set.

Text in the SVG renders with the fonts you drop beside it (`.ttf`, `.otf`, `.ttc`).

## Command line

The same engine runs as a command, for scripts and builds. It is written in Rust.

```sh title="Every format and size of each SVG"
typ logo.svg
typ -f png,ico -s 64,512 logo.svg
typ -o assets *.svg
```

```sh title="Install"
git clone https://github.com/gildrb/archetypon
cd archetypon
make
sudo make install
```

## Questions

### How do I make a favicon from an SVG?

Drop the SVG on this page and download the ZIP. It holds `.ico` and the PNG sizes that browsers and phones ask for.

### Are my files uploaded?

No. Archetypon is compiled to WebAssembly and runs on your device.
