// Turns raw screen recordings into small, silent, looping card clips.
//
//   node make-clips.js
//
// Reads any video in clips/ named after a card key (lotk, framecolor, cosmeow,
// railnation) with any extension — .mp4, .mov, .mkv, .webm, .gif — and writes
// assets/clips/<key>.mp4, sized for the card thumbnail. Audio is dropped, the
// file is made web-streamable (moov atom first) and trimmed to CLIP_SECONDS.
//
// Needs ffmpeg. Point FFMPEG_PATH at a binary, or `npm i ffmpeg-static`.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname);
const IN_DIR = path.join(ROOT, "clips");
const OUT_DIR = path.join(ROOT, "assets", "clips");

// output name -> { names accepted in clips/, and optionally which slice to take }
// so recordings can be dropped in under whatever they were saved as.
//   from    seconds to skip at the start (default 0)
//   seconds how much to keep (default CLIP_SECONDS)
const KEYS = {
  lotk:       { alias: ["lotk", "lordofthekings", "lotk_gameplay"] },
  framecolor: { alias: ["framecolor", "framecoloring", "framecoloringv2", "tool"] },
  cosmeow:    { alias: ["cosmeow"] },
  railnation: { alias: ["railnation", "rn", "rail-nation"] },
  battleday:  { alias: ["battleday", "rpg", "battle-day"] },
  racing:     { alias: ["racing", "race", "carcustomizationinunity", "cafebazaar"],
                seconds: 20 },   // the customization showcase runs long
};
const EXTS = [".mp4", ".mov", ".mkv", ".webm", ".avi", ".gif", ".m4v"];

const WIDTH = 620;        // cards render ~262-300 CSS px; 2x for retina
const FPS = 24;
const CRF = 30;           // higher = smaller. 28-32 is the sweet spot here
const CLIP_SECONDS = 12;  // default; per-clip overrides live in KEYS

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require("ffmpeg-static"); } catch { /* fall through */ }
  return "ffmpeg";                                  // hope it is on PATH
}

const FFMPEG = ffmpegPath();

// Match any accepted alias, ignoring case and separators — "FrameColoring.mp4",
// "frame-coloring.MOV" and "framecolor.mp4" all resolve to the framecolor clip.
const norm = (s) => s.toLowerCase().replace(/[\s_-]/g, "");

function findSource(aliases) {
  const wanted = new Set(aliases.map(norm));
  for (const file of fs.readdirSync(IN_DIR)) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTS.includes(ext)) continue;
    if (wanted.has(norm(path.basename(file, path.extname(file)))))
      return path.join(IN_DIR, file);
  }
  return null;
}

function encode(src, dst, { from = 0, seconds = CLIP_SECONDS } = {}) {
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error",
    // -ss before -i seeks fast; -t after it bounds the kept slice
    ...(from ? ["-ss", String(from)] : []),
    "-t", String(seconds),
    "-i", src,
    "-an",                                          // no audio track at all
    "-vf", `fps=${FPS},scale=${WIDTH}:-2:flags=lanczos`,
    "-c:v", "libx264",
    "-profile:v", "main", "-pix_fmt", "yuv420p",    // maximum device support
    "-crf", String(CRF),
    "-preset", "slower",
    "-movflags", "+faststart",
    dst,
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

if (!fs.existsSync(IN_DIR)) {
  console.error(`no clips/ folder — create ${path.relative(ROOT, IN_DIR)} and drop recordings in it,`);
  console.error(`named ${Object.keys(KEYS).join(", ")} (any video extension).`);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

let made = 0;
for (const [key, spec] of Object.entries(KEYS)) {
  const src = findSource(spec.alias);
  if (!src) { console.log(`${key.padEnd(12)} — no source, skipped`); continue; }
  const dst = path.join(OUT_DIR, key + ".mp4");
  const secs = spec.seconds ?? CLIP_SECONDS;
  encode(src, dst, { from: spec.from ?? 0, seconds: secs });
  const inSize = fs.statSync(src).size, outSize = fs.statSync(dst).size;
  const slice = `${spec.from ?? 0}s+${secs}s`;
  console.log(
    `${key.padEnd(12)} ${path.basename(src).slice(0, 28).padEnd(30)} ${slice.padEnd(9)} ` +
    `${(inSize / 1024 / 1024).toFixed(1).padStart(6)} MB -> ${(outSize / 1024).toFixed(0).padStart(5)} KB`
  );
  made++;
}

console.log(made ? `\n${made} clip(s) written to assets/clips — now run: node build.js` : "\nnothing to do");
