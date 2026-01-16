// Hinglish code:

import fs from "fs";
import path from "path";

export const generateMasterPlaylist = async (videoId, variants) => {
  // variants array example: ["360p", "480p", "720p", "1080p"]

  let master = "#EXTM3U\n";

  // yaha har variant ko stream info ke sath add kar rahe:
  variants.forEach(v => {
    const bandwidth = {
      "360p": 800000,
      "480p": 1400000,
      "720p": 2800000,
      "1080p": 5000000
    }[v];

    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolutionOf(v)}\n`;
    master += `${v}/index.m3u8\n`;
  });

  const masterPath = path.join("temp", videoId, "master.m3u8");
  
  return new Promise((resolve, reject) => {
    fs.writeFile(masterPath, master, (err) => {
      if (err) {
        reject(new Error(`Failed to write master playlist: ${err.message}`));
      } else {
        console.log("Master Playlist:", masterPath);
        resolve(masterPath);
      }
    });
  });
};

// Helper: resolution mapping
const resolutionOf = (v) => {
  switch (v) {
    case "360p": return "640x360";
    case "480p": return "854x480";
    case "720p": return "1280x720";
    case "1080p": return "1920x1080";
  }
};
