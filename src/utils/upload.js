// Hinglish code:

import fs from "fs";
import path from "path";
import { UTApi } from "uploadthing/server";

export const uploadHLSFolder = async (folderPath, videoId) => {
  const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

  const files = [];

  const walk = (dir) => {
    fs.readdirSync(dir).forEach((f) => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        const data = fs.readFileSync(full);
        const relativePath = path.relative(folderPath, full).replace(/\\/g, "/");
        files.push({ data, name: `${videoId}/${relativePath}` });
      }
    });
  };

  walk(folderPath);

  const result = await utapi.uploadFiles(
    files.map((f) => new File([f.data], f.name))
  );

  const urls = {};
  result.forEach((r) => {
    urls[r.fileKey] = r.ufsUrl;
  });

  return urls;
};
