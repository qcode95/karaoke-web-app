import { writeFileSync } from "node:fs";

writeFileSync(
  "env.js",
  `window.KARAOKE_YOUTUBE_API_KEY = ${JSON.stringify(process.env.YOUTUBE_API_KEY || "")};\n`,
);

