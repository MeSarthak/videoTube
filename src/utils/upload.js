import fs from "fs";
import path from "path";
import { UTApi } from "uploadthing/server";
import { File } from "buffer";

const utapi = new UTApi();

export const uploadHLSFolder = async (folderPath, videoId) => {
  try {
    const files = [];
    const fileNames = [];

    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walk(fullPath);
        } else {
          const buffer = fs.readFileSync(fullPath);
          const relativePath = path.relative(folderPath, fullPath).replace(/\\/g, '/');

          const fileName = `${videoId}/${relativePath}`;
          fileNames.push(fileName);
          
          files.push(
            new File([buffer], fileName, {
              type: getMimeType(relativePath)
            })
          );
        }
      }
    };

    walk(folderPath);

    // Actually upload to UploadThing
    const response = await utapi.uploadFiles(files); 

    // Create a mapping of fileName -> URL
    const uploadedMap = {};
    response.forEach((r, index) => {
      if (r.data) {
        uploadedMap[fileNames[index]] = r.data.url;
      }
    });

    return uploadedMap;
  } catch (error) {
    console.error("UploadThing upload error:", error);
    throw error;
  }
};

// Utility for MIME detection
const getMimeType = (file) => {
  if (file.endsWith(".ts")) return "video/mp2t";
  if (file.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (file.endsWith(".jpg")) return "image/jpeg";
  return "application/octet-stream";
};
