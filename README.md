# sadradelir.github.io

My portfolio site. One self-contained HTML file: images and the résumé are
inlined as base64, so `index.html` works anywhere — a web host, a USB stick,
or a double-click.

## Build

`index.html` is generated; **edit `template.html`, never `index.html`.**

```bash
node build.js
```

The script inlines everything in `assets/` plus the résumé from `../Sadra_Delir_CV.docx`,
and reports anything missing.

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
