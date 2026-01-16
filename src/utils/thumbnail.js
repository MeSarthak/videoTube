// Hinglish code:

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export const generateThumbnail = async (inputBuffer, videoId) => {
  const thumbPath = path.join("temp", videoId, "thumb.jpg");

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-i", "pipe:0",
      "-ss", "00:00:02", // 2nd second ka frame
      "-vframes", "1",
      "-q:v", "2",       // quality high
      thumbPath
    ]);

    let errorOutput = "";

    ff.stdin.write(inputBuffer);
    ff.stdin.end();

    ff.stderr.on("data", (d) => {
      errorOutput += d.toString();
    });

    ff.on("close", (code) => {
      if (code === 0) {
        console.log("Thumbnail:", thumbPath);
        resolve(thumbPath);
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
      }
    });

    ff.on("error", (err) => {
      reject(new Error(`FFmpeg process error: ${err.message}`));
    });
  });
};
