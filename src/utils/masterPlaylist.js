import fs from "fs";
import path from "path";

export const generateMasterPlaylist = async (videoId, variants) => {
  let master = "#EXTM3U\n";

  const bandwidth = {
    "360p": 800000,
    "480p": 1400000,
    "720p": 2800000,
    "1080p": 5000000,
  };

  const resolution = {
    "360p": "640x360",
    "480p": "854x480",
    "720p": "1280x720",
    "1080p": "1920x1080",
  };

  variants.forEach((v) => {
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth[v]},RESOLUTION=${resolution[v]}\n`;
    master += `${v}/index.m3u8\n`;
  });

  const masterPath = path.join("public", "temp", videoId, "master.m3u8");

  await fs.promises.writeFile(masterPath, master);

  return masterPath;
};
