// Hinglish code:

import { spawn } from "child_process";

export const hasAudioTrack = async (inputBuffer) => {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffprobe", [
      "-v", "error",
      "-select_streams", "a",
      "-show_entries", "stream=index",
      "-of", "csv=p=0",
      "pipe:0"
    ]);

    let output = "";
    ff.stdout.on("data", (d) => output += d.toString());
    ff.stderr.on("data", (d) => {}); // ignore

    ff.on("close", () => {
      // agar audio stream mila toh output empty nahi hoga
      resolve(output.trim().length > 0);
    });

    ff.on("error", reject);

    ff.stdin.write(inputBuffer);
    ff.stdin.end();
  });
};
