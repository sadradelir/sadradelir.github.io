// Builds the site from template.html by inlining assets as base64.
//
//   node build.js            both entries
//   node build.js games      just the games one
//   node build.js backend    just the backend one
//
// Two entry points, one template. "/" leads on Unity and games, "/backend/"
// on server work, and PROFILE_GAMES / PROFILE_BACKEND select between them
// through the same conditionals the optional assets already use. Two copies of
// the markup would drift within a month, so the only thing that differs per
// profile is text, the CV, and some CSS ordering.
//
// Placeholders:
//   {{KEY}}                              replaced with the asset's base64
//   <!--IF:KEY-->    ... <!--ENDIF-->    kept only when that asset exists
//   <!--IFNOT:KEY--> ... <!--ENDIF-->    kept only when it does NOT exist
//
// Assets listed in OPTIONAL may be absent: their IF blocks are dropped and the
// build still succeeds, so a card can fall back to a text-only layout until the
// screenshots land on disk.
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const ASSETS = path.join(ROOT, "assets");

// placeholder -> asset file (relative to assets/)
const IMAGES = {
  HERO_B64:     "cosmeow/hero.jpg",
  RN_HERO_B64:  "railnation/hero.jpg",

  // Rail Nation Remastered is a separate game sharing Rail Nation's backend,
  // so it gets its own card and its own shots rather than reusing the old ones
  RNR_HERO_B64: "rnr/hero.jpg",

  AVATAR_B64: "avatar.jpg",

  // Lord of the Kings (working title): drop PNG/JPGs in assets/lotk/
  LOTK_HERO_B64:  "lotk/hero.jpg",

  // BattleDay (Part Games): drop JPGs in assets/battleday/
  BD_HERO_B64:   "battleday/hero.jpg",
  RACE_HERO_B64: "racing/hero.jpg",
  DV_HERO_B64:   "divar/hero.jpg",
  VC_HERO_B64:   "voice/hero.jpg",
  IR_HERO_B64:   "idlerunner/hero.jpg",
  PG_HERO_B64:   "palgam/hero.jpg",
  PR_HERO_B64:   "prototyping/hero.jpg",

  // Frame Coloring V2: drop PNGs in assets/framecolor/
  FC_HERO_B64:  "framecolor/hero.jpg",
};

// LINKED assets: the placeholder becomes a relative URL instead of base64, so
// the browser fetches the file only when it is actually needed: a clip when the
// pointer reaches its card (preload="none"), a gallery shot when its modal
// opens. Both are things most visitors never do, and inlining them would put the
// whole lot in front of everyone on first load. Their <!--IF--> blocks still
// work, so a card with no clip renders as a plain still.
const LINKED = {
  // card hover clips, produced by make-clips.js from recordings in clips/
  LOTK_CLIP: "clips/lotk.mp4",
  FC_CLIP:   "clips/framecolor.mp4",
  CM_CLIP:   "clips/cosmeow.mp4",
  RN_CLIP:   "clips/railnation.mp4",
  RNR_CLIP:  "clips/rnr.mp4",
  BD_CLIP:   "clips/battleday.mp4",
  RACE_CLIP: "clips/racing.mp4",
  IR_CLIP:   "clips/idlerunner.mp4",
  PG_CLIP:   "clips/palgam.mp4",
  PR_CLIP:   "clips/prototyping.mp4",

  // modal gallery shots
  SHOT1_B64:       "cosmeow/shot1.jpg",
  SHOT2_B64:       "cosmeow/shot2.jpg",
  SHOT3_B64:       "cosmeow/shot3.jpg",
  SHOT4_B64:       "cosmeow/shot4.jpg",
  SHOT5_B64:       "cosmeow/shot5.jpg",
  RN_SHOT1_B64:    "railnation/shot1.jpg",
  RN_SHOT2_B64:    "railnation/shot2.jpg",
  RN_SHOT3_B64:    "railnation/shot3.jpg",
  RN_SHOT4_B64:    "railnation/shot4.jpg",
  LOTK_SHOT1_B64:  "lotk/shot1.jpg",
  LOTK_SHOT2_B64:  "lotk/shot2.jpg",
  LOTK_SHOT3_B64:  "lotk/shot3.jpg",
  FC_SHOT1_B64:    "framecolor/shot1.jpg",
  FC_SHOT2_B64:    "framecolor/shot2.jpg",
  PG_SHOT1: "palgam/shot1.jpg",
  PG_SHOT2: "palgam/shot2.jpg",
  PG_SHOT3: "palgam/shot3.jpg",
  PR_SHOT1: "prototyping/shot1.jpg",
  PR_SHOT2: "prototyping/shot2.jpg",
  PR_SHOT3: "prototyping/shot3.jpg",
  PR_SHOT4: "prototyping/shot4.jpg",
  RNR_SHOT1: "rnr/shot1.jpg",
  RNR_SHOT2: "rnr/shot2.jpg",
  RNR_SHOT3: "rnr/shot3.jpg",
  RNR_SHOT4: "rnr/shot4.jpg",

  BD_SHOT1: "battleday/shot1.jpg",
  BD_SHOT2: "battleday/shot2.jpg",
  BD_SHOT3: "battleday/shot3.jpg",
  BD_SHOT4: "battleday/shot4.jpg",
  BD_SHOT5: "battleday/shot5.jpg",
  IR_SHOT1: "idlerunner/shot1.jpg",
  IR_SHOT2: "idlerunner/shot2.jpg",
  IR_SHOT3: "idlerunner/shot3.jpg",
};

// The two entries, and what differs between them. `prefix` matters: linked
// assets are written as relative URLs, and from backend/index.html "assets/x"
// would resolve to backend/assets/x, which does not exist.
const PROFILES = {
  games:   { key: "PROFILE_GAMES",   out: "index.html",         cv: "Unity",   prefix: "" },
  backend: { key: "PROFILE_BACKEND", out: "backend/index.html", cv: "Backend", prefix: "../" },
};

// The download link hands over the dated filename build-cv.js writes alongside
// the embedded PDF, so a recruiter can tell which version they have. Derived
// here rather than written into the template, which would go stale the next
// time the CV is rebuilt.
function datedCvName(track) {
  const parent = path.join(ROOT, "..");
  const re = new RegExp(`^Sadra_Delir_CV_${track}_\d{4}-\d{2}-\d{2}\.pdf$`);
  const dated = fs.readdirSync(parent).filter((f) => re.test(f)).sort();
  return dated.length ? dated[dated.length - 1] : `Sadra_Delir_CV_${track}.pdf`;
}

// keys allowed to be missing; the build warns instead of leaving a hole
const OPTIONAL = new Set([
  "AVATAR_B64",
  "LOTK_CLIP", "FC_CLIP", "CM_CLIP", "RN_CLIP", "BD_CLIP", "RACE_CLIP",
  "BD_HERO_B64", "RACE_HERO_B64", "DV_HERO_B64", "VC_HERO_B64", "IR_HERO_B64", "IR_CLIP",
  "BD_SHOT1", "BD_SHOT2", "BD_SHOT3", "BD_SHOT4", "BD_SHOT5",
  "IR_SHOT1", "IR_SHOT2", "IR_SHOT3",
  "PG_HERO_B64", "PG_CLIP", "PG_SHOT1", "PG_SHOT2", "PG_SHOT3",
  "PR_HERO_B64", "PR_CLIP", "PR_SHOT1", "PR_SHOT2", "PR_SHOT3", "PR_SHOT4",
  "RNR_HERO_B64", "RNR_CLIP", "RNR_SHOT1", "RNR_SHOT2", "RNR_SHOT3", "RNR_SHOT4",
  "LOTK_HERO_B64", "LOTK_SHOT1_B64", "LOTK_SHOT2_B64", "LOTK_SHOT3_B64",
  "FC_HERO_B64", "FC_SHOT1_B64", "FC_SHOT2_B64",
]);

const b64 = (file) => fs.readFileSync(file).toString("base64");

// Resolve <!--IF:KEY--> / <!--IFNOT:KEY--> ... <!--ENDIF--> against `present`.
// Blocks nest, so collapse the innermost ones (those containing no further IF
// or ENDIF marker) and repeat until nothing changes. The regex is global, so a
// pass clears every innermost block rather than one: passes then bound nesting
// depth, not the number of conditionals in the file.
function resolveConditionals(html, present) {
  const innermost = /<!--IF(NOT)?:([A-Z0-9_]+)-->((?:(?!<!--IF(?:NOT)?:|<!--ENDIF-->)[\s\S])*)<!--ENDIF-->/g;
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

const TEMPLATE = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");

/* ---------- scan the assets once, they do not vary by profile ---------- */
const present = new Set();
const missing = [];
const inlined = {};   // key -> file to base64
const linked = {};    // key -> path relative to the site root
let linkedBytes = 0;

for (const [key, rel] of Object.entries(IMAGES)) {
  const file = path.join(ASSETS, rel);
  if (fs.existsSync(file)) { present.add(key); inlined[key] = file; }
  else missing.push(`${rel}${OPTIONAL.has(key) ? "  (optional)" : ""}`);
}
for (const [key, rel] of Object.entries(LINKED)) {
  const file = path.join(ASSETS, rel);
  if (fs.existsSync(file)) {
    present.add(key);
    linked[key] = `assets/${rel}`;
    linkedBytes += fs.statSync(file).size;
  } else missing.push(`${rel}${OPTIONAL.has(key) ? "  (optional)" : ""}`);
}

const required = missing.filter((m) => !m.endsWith("(optional)"));
if (missing.length) console.warn("missing assets:\n  " + missing.join("\n  "));

/* ---------- then render each entry ---------- */
const wanted = process.argv[2] ? [process.argv[2]] : Object.keys(PROFILES);
for (const name of wanted) {
  if (!PROFILES[name]) {
    console.error(`unknown profile "${name}", expected one of: ${Object.keys(PROFILES).join(", ")}`);
    process.exit(1);
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";

for (const name of wanted) {
  const profile = PROFILES[name];
  const cvFile = path.join(ROOT, "..", `Sadra_Delir_CV_${profile.cv}.pdf`);
  const keys = new Set(present);
  keys.add(profile.key);
  if (fs.existsSync(cvFile)) keys.add("CV_B64");
  else console.warn(`missing CV for ${name}: ${path.basename(cvFile)}`);

  let html = resolveConditionals(TEMPLATE, keys);

  for (const [key, file] of Object.entries(inlined)) {
    if (!html.includes(`{{${key}}}`)) continue;
    html = html.split(`{{${key}}}`).join(b64(file));
  }
  if (keys.has("CV_B64")) html = html.split("{{CV_B64}}").join(b64(cvFile));
  for (const [key, url] of Object.entries(linked)) {
    html = html.split(`{{${key}}}`).join(profile.prefix + url);
  }
  html = html.split("{{CV_FILENAME}}").join(datedCvName(profile.cv));

  const left = html.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (left) console.warn(`${name}: unresolved placeholders: ` + [...new Set(left)].join(", "));

  const out = path.join(ROOT, profile.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);

  console.log(
    `built ${profile.out.padEnd(18)} ${mb(fs.statSync(out).size)} on first load` +
    (required.length ? `  [${required.length} required asset(s) missing]` : "")
  );
}

const clipCount = Object.keys(linked).length;
if (clipCount) {
  console.log(`  + ${clipCount} linked file(s), ${mb(linkedBytes)}, fetched on demand, shared by both entries`);
}
