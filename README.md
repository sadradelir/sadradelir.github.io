# sadradelir.github.io

My portfolio site. `index.html` carries its images and the résumé inlined as
base64, so the page needs no image requests at all.

The card hover clips are the exception: they are **linked**, not inlined, and
live in `assets/clips/`. With `preload="none"` the browser fetches one only when
the pointer reaches its card, which keeps them out of the first page load
entirely — inlining four clips put 2 MB of video in front of every visitor,
including the ones on a phone who never hover anything. Keep `assets/` next to
`index.html` and the page still works from a plain folder or a USB stick.

## Build

`index.html` is generated; **edit `template.html`, never `index.html`.**

```bash
node build.js
```

The script inlines everything in `assets/` plus the résumé from `../Sadra_Delir_CV.pdf`,
and reports anything missing.

### Résumé

The site embeds the **PDF**. It is generated in two steps from the parent folder:

```bash
node build_cv.js      # authors Sadra_Delir_CV.docx
./make-cv-pdf.ps1     # converts it to .pdf via the installed Word
```

Re-run `node build.js` afterwards, or the site keeps serving the old résumé.

### Card clips

`make-clips.js` turns raw screen recordings in `clips/` (git-ignored) into small
silent looping MP4s in `assets/clips/`, named `lotk`, `framecolor`, `cosmeow`,
`railnation`. They play on hover, or when scrolled into view on touch devices.

```bash
node make-clips.js && node build.js
```

It needs ffmpeg — `npm i ffmpeg-static`, or set `FFMPEG_PATH`. Each entry in the
script's `KEYS` map lists the filenames it accepts (case and separators are
ignored) and may set its own `from` / `seconds` trim window.

`build.js` reports the first-load size and the linked clip weight separately, so
it is obvious which one a change moved.

### Template placeholders

| Syntax | Meaning |
| --- | --- |
| `{{KEY}}` | replaced with that asset's base64 |
| `<!--IF:KEY--> … <!--ENDIF-->` | kept only when the asset exists |
| `<!--IFNOT:KEY--> … <!--ENDIF-->` | kept only when it does not |

Keys in `OPTIONAL` may be absent — the build still succeeds and the card falls
back to a text-only layout. That is how the project cards stay valid before
their screenshots exist. Conditionals nest.

## Adding a project

1. Drop images in `assets/<project>/` (JPEG, ~1100–1280px wide is plenty).
2. Register them in the `IMAGES` map in `build.js`.
3. Add a `.card` in `template.html` and a matching `<template id="detail-…">`.
4. `node build.js`.

## Deploy

GitHub Pages serves `index.html` from the branch root. `.nojekyll` stops Jekyll
from touching the output.
