import fs from "fs";
import path from "path";
import { BlobServiceClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error(
    "AZURE_STORAGE_CONNECTION_STRING environment variable is not set"
  );
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

const containerName = process.env.CONTAINER_NAME || "videos";

export const uploadHLSFolder = async (folderPath, videoId) => {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const uploadedMap = {};

    const walk = async (dir) => {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          await walk(fullPath);
        } else {
          const buffer = fs.readFileSync(fullPath);
          const relativePath = path.relative(folderPath, fullPath).replace(/\\/g, '/');
          const blobName = `${videoId}/${relativePath}`;

          // Upload to Azure Blob Storage
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { blobContentType: getMimeType(relativePath) }
          });

          uploadedMap[blobName] = blockBlobClient.url;
        }
      }
    };

    await walk(folderPath);
    return uploadedMap;
  } catch (error) {
    console.error("Azure Blob Storage upload error:", error);
    throw error;
  }
};

const getMimeType = (file) => {
  if (file.endsWith(".ts")) return "video/mp2t";
  if (file.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (file.endsWith(".jpg")) return "image/jpeg";
  return "application/octet-stream";
};
