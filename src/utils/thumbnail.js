import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const generateThumbnail = async (inputPath, videoId) => {
  const outDir = path.join("temp", videoId);
  fs.mkdirSync(outDir, { recursive: true });
  const thumbPath = path.join(outDir, "thumb.jpg");

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-i",
      inputPath,
      "-ss",
      "00:00:02",
      "-vframes",
      "1",
      "-q:v",
      "2",
      thumbPath,
    ]);

    let errStr = "";

    ff.stderr.on("data", (d) => (errStr += d.toString()));

    ff.on("close", (code) => {
      if (code === 0) resolve(thumbPath);
      else reject(new Error(`Thumbnail failed [${code}]: ${errStr}`));
    });

    ff.on("error", (err) => reject(err));
  });
};
