// Hinglish code:

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { hasAudioTrack } from "./ffprobe.js";

export const generateHLS = async (inputBuffer, videoId) => {
  const baseFolder = path.join("temp", videoId);
  fs.mkdirSync(baseFolder, { recursive: true });

  // subtitles, audio detection etc. can be added later
  const audioExists = await hasAudioTrack(inputBuffer);

  // scale variants (bitrate ladder)
  const variants = [
    { name: "360p",  width: 640,  height: 360,  videoBitrate: "800k",  audioBitrate: "64k" },
    { name: "480p",  width: 854,  height: 480,  videoBitrate: "1400k", audioBitrate: "96k" },
    { name: "720p",  width: 1280, height: 720,  videoBitrate: "2800k", audioBitrate: "128k" },
    { name: "1080p", width: 1920, height:1080,  videoBitrate: "5000k", audioBitrate: "192k" }
  ];

  // ffmpeg args build
  const ffArgs = [
    "-i", "pipe:0",
    "-preset", "veryfast",
    "-g", "48",
    "-sc_threshold", "0",
  ];

  // maps dynamic
  variants.forEach((v, idx) => {
    ffArgs.push(
      "-map", "0:v:0"
    );
    if (audioExists) {
      ffArgs.push("-map", "0:a:0?");
    }
    ffArgs.push(
      `-vf`, `scale=w=${v.width}:h=${v.height}`,
      "-c:v", "libx264",
      "-b:v", v.videoBitrate,
      "-maxrate", v.videoBitrate,
      "-bufsize", "2M"
    );

    if (audioExists) {
      ffArgs.push("-c:a", "aac", "-b:a", v.audioBitrate);
    }

    const outDir = path.join(baseFolder, v.name);
    fs.mkdirSync(outDir, { recursive: true });

    ffArgs.push(
      "-f", "hls",
      "-hls_time", "4",
      "-hls_playlist_type", "vod",
      "-hls_segment_filename", `${outDir}/segment_%03d.ts`,
      path.join(outDir, "index.m3u8")
    );
  });

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ffArgs);

    let errorOutput = "";

    ff.stdin.write(inputBuffer);
    ff.stdin.end();

    ff.stderr.on("data", (d) => {
      errorOutput += d.toString();
    });

    ff.on("close", (code) => {
      if (code === 0) {
        resolve({ baseFolder, variants: variants.map(v => v.name) });
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
      }
    });

    ff.on("error", (err) => {
      reject(new Error(`FFmpeg process error: ${err.message}`));
    });
  });
};
