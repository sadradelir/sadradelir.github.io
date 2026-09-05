// Builds portfolio.html from template.html by inlining assets as base64.
// Usage: node build.js
//
// Placeholders:
//   {{KEY}}                              replaced with the asset's base64
//   <!--IF:KEY-->    ... <!--ENDIF-->    kept only when that asset exists
//   <!--IFNOT:KEY--> ... <!--ENDIF-->    kept only when it does NOT exist
//
// Assets listed in OPTIONAL may be absent — their IF blocks are dropped and the
// build still succeeds, so a card can fall back to a text-only layout until the
// screenshots land on disk.
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const ASSETS = path.join(ROOT, "assets");

// placeholder -> asset file (relative to assets/)
const IMAGES = {
  HERO_B64:     "cosmeow/hero.jpg",
  SHOT1_B64:    "cosmeow/shot1.jpg",
  SHOT2_B64:    "cosmeow/shot2.jpg",
  SHOT3_B64:    "cosmeow/shot3.jpg",
  SHOT4_B64:    "cosmeow/shot4.jpg",
  SHOT5_B64:    "cosmeow/shot5.jpg",
  RN_HERO_B64:  "railnation/hero.jpg",
  RN_SHOT1_B64: "railnation/shot1.jpg",
  RN_SHOT2_B64: "railnation/shot2.jpg",
  RN_SHOT3_B64: "railnation/shot3.jpg",
  RN_SHOT4_B64: "railnation/shot4.jpg",

  AVATAR_B64: "avatar.jpg",

  // Lord of the Kings (working title) — drop PNG/JPGs in assets/lotk/
  LOTK_HERO_B64:  "lotk/hero.jpg",
  LOTK_SHOT1_B64: "lotk/shot1.jpg",
  LOTK_SHOT2_B64: "lotk/shot2.jpg",
  LOTK_SHOT3_B64: "lotk/shot3.jpg",

  // BattleDay (Part Games) — drop JPGs in assets/battleday/
  BD_HERO_B64:   "battleday/hero.jpg",
  RACE_HERO_B64: "racing/hero.jpg",
  DV_HERO_B64:   "divar/hero.jpg",
  VC_HERO_B64:   "voice/hero.jpg",
  IR_HERO_B64:   "idlerunner/hero.jpg",

  // Frame Coloring V2 — drop PNGs in assets/framecolor/
  FC_HERO_B64:  "framecolor/hero.jpg",
  FC_SHOT1_B64: "framecolor/shot1.jpg",
  FC_SHOT2_B64: "framecolor/shot2.jpg",
};

// LINKED assets: the placeholder becomes a relative URL instead of base64, so
// the browser fetches the file only when it is actually needed — a clip when the
// pointer reaches its card (preload="none"), a gallery shot when its modal
// opens. Both are things most visitors never do, and inlining them would put the
// whole lot in front of everyone on first load. Their <!--IF--> blocks still
// work, so a card with no clip renders as a plain still.
const LINKED = {
  // card hover clips — produced by make-clips.js from recordings in clips/
  LOTK_CLIP: "clips/lotk.mp4",
  FC_CLIP:   "clips/framecolor.mp4",
  CM_CLIP:   "clips/cosmeow.mp4",
  RN_CLIP:   "clips/railnation.mp4",
  BD_CLIP:   "clips/battleday.mp4",
  RACE_CLIP: "clips/racing.mp4",
  IR_CLIP:   "clips/idlerunner.mp4",

  // modal gallery shots
  BD_SHOT1: "battleday/shot1.jpg",
  BD_SHOT2: "battleday/shot2.jpg",
  BD_SHOT3: "battleday/shot3.jpg",
  BD_SHOT4: "battleday/shot4.jpg",
  BD_SHOT5: "battleday/shot5.jpg",
  IR_SHOT1: "idlerunner/shot1.jpg",
  IR_SHOT2: "idlerunner/shot2.jpg",
  IR_SHOT3: "idlerunner/shot3.jpg",
};

// non-image files inlined as base64 too (CV download)
const FILES = {
  CV_B64: path.join(ROOT, "..", "Sadra_Delir_CV.pdf"),
};

// keys allowed to be missing — the build warns instead of leaving a hole
const OPTIONAL = new Set([
  "AVATAR_B64",
  "LOTK_CLIP", "FC_CLIP", "CM_CLIP", "RN_CLIP", "BD_CLIP", "RACE_CLIP",
  "BD_HERO_B64", "RACE_HERO_B64", "DV_HERO_B64", "VC_HERO_B64", "IR_HERO_B64", "IR_CLIP",
  "BD_SHOT1", "BD_SHOT2", "BD_SHOT3", "BD_SHOT4", "BD_SHOT5",
  "IR_SHOT1", "IR_SHOT2", "IR_SHOT3",
  "LOTK_HERO_B64", "LOTK_SHOT1_B64", "LOTK_SHOT2_B64", "LOTK_SHOT3_B64",
  "FC_HERO_B64", "FC_SHOT1_B64", "FC_SHOT2_B64",
]);

const b64 = (file) => fs.readFileSync(file).toString("base64");

// Resolve <!--IF:KEY--> / <!--IFNOT:KEY--> ... <!--ENDIF--> against `present`.
// Blocks nest, so collapse the innermost ones (those containing no further IF
// or ENDIF marker) and repeat until nothing changes.
function resolveConditionals(html, present) {
  const innermost = /<!--IF(NOT)?:([A-Z0-9_]+)-->((?:(?!<!--IF(?:NOT)?:|<!--ENDIF-->)[\s\S])*)<!--ENDIF-->/;
  for (let pass = 0; pass < 50; pass++) {
    const next = html.replace(innermost, (_, not, key, inner) =>
      present.has(key) === !not ? inner : ""
    );
    if (next === html) break;
    html = next;
  }
  const stray = html.match(/<!--(?:IF(?:NOT)?:[A-Z0-9_]+|ENDIF)-->/g);
  if (stray) console.warn("unbalanced conditional markers: " + stray.join(", "));
  return html;
}

let html = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");

const present = new Set();
const missing = [];
const inlined = {};   // key -> file to base64
const linked = {};    // key -> relative URL to leave as a link
let inlineBytes = 0, linkedBytes = 0;

for (const [key, rel] of Object.entries(IMAGES)) {
  const file = path.join(ASSETS, rel);
  if (fs.existsSync(file)) { present.add(key); inlined[key] = file; }
  else missing.push(`${rel}${OPTIONAL.has(key) ? "  (optional)" : ""}`);
}
for (const [key, file] of Object.entries(FILES)) {
  if (fs.existsSync(file)) { present.add(key); inlined[key] = file; }
  else missing.push(file);
}
for (const [key, rel] of Object.entries(LINKED)) {
  const file = path.join(ASSETS, rel);
  if (fs.existsSync(file)) {
    present.add(key);
    linked[key] = `assets/${rel}`;
    linkedBytes += fs.statSync(file).size;
  } else missing.push(`${rel}${OPTIONAL.has(key) ? "  (optional)" : ""}`);
}

html = resolveConditionals(html, present);
for (const [key, file] of Object.entries(inlined)) {
  if (!html.includes(`{{${key}}}`)) continue;
  inlineBytes += fs.statSync(file).size;
  html = html.split(`{{${key}}}`).join(b64(file));
}
for (const [key, url] of Object.entries(linked)) {
  html = html.split(`{{${key}}}`).join(url);
}

const required = missing.filter((m) => !m.endsWith("(optional)"));
const left = html.match(/\{\{[A-Z0-9_]+\}\}/g);

if (missing.length) console.warn("missing assets:\n  " + missing.join("\n  "));
if (left) console.warn("unresolved placeholders: " + [...new Set(left)].join(", "));

const out = path.join(ROOT, "index.html");
fs.writeFileSync(out, html);

const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";
const clipCount = Object.keys(linked).length;
console.log(
  `built ${path.relative(ROOT, out)} — ${mb(fs.statSync(out).size)} on first load` +
  (required.length ? `  [${required.length} required asset(s) missing]` : "")
);
if (clipCount) {
  console.log(`  + ${clipCount} linked file(s), ${mb(linkedBytes)}, fetched on demand — not in that figure`);
}
