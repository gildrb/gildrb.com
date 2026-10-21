# Archetypon: convert SVG to PNG, ICO, WebP, JPEG and PDF

Turn one SVG into every file that a logo or an icon needs, in your browser: favicons, app icons, PNG, WebP, JPEG and a vector PDF.

## The problem

A logo needs many files: favicons, app icons, PNG for slides, PDF for print and WebP for the web. To export each size by hand takes time. Each export can get a size or a background wrong.

## What you get

- Optimized SVG.
- PNG, WebP and JPEG at each size that you select, from 16 to 4096 pixels.
- One ICO favicon that holds many sizes.
- A vector PDF.
- A transparent or an opaque background. You set the JPEG quality.

If the SVG has text, add its font files: `.ttf`, `.otf` or `.ttc`.

## Command line

The `typ` command uses the same engine. Use it in scripts and builds.

Make every format at every size:

```sh
typ logo.svg
```

Make only PNG and ICO, at 64 and 512 pixels:

```sh
typ -f png,ico -s 64,512 logo.svg
```

Convert all SVGs of a folder into `assets`:

```sh
typ -o assets *.svg
```

## Install

Build the command from source:

```sh
git clone https://github.com/gildrb/archetypon
cd archetypon
make
sudo make install
```

Archetypon is free and open source. The source code is on [GitHub](https://github.com/gildrb/archetypon).

## Questions

### How do I make a favicon from an SVG?

Drop the SVG on this page. Download the ZIP. It holds the `.ico` file and the PNG sizes that browsers and phones use.

### Are my files uploaded?

No. Archetypon runs on your device, in WebAssembly.
