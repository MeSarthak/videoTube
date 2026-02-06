import fs from "fs";
import path from "path";
import { BlobServiceClient } from "@azure/storage-blob";

let blobServiceClient = null;

const getBlobServiceClient = () => {
  if (!blobServiceClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "AZURE_STORAGE_CONNECTION_STRING environment variable is not set"
      );
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
};

const containerName = process.env.CONTAINER_NAME || "videos";

export const uploadHLSFolder = async (folderPath, videoId) => {
  try {
    // Validate inputs
    if (!folderPath || typeof folderPath !== "string" || folderPath.trim() === "") {
      throw new Error("Invalid folderPath: must be a non-empty string");
    }
    if (!videoId || typeof videoId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
      throw new Error("Invalid videoId format");
    }

    const blobClient = getBlobServiceClient();
    const containerClient = blobClient.getContainerClient(containerName);
    const uploadedMap = {};

    const walk = async (dir, visitedInodes = new Set()) => {
      const entries = await fs.promises.readdir(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        // Use lstat to detect symlinks without following them
        const stat = await fs.promises.lstat(fullPath);

        if (stat.isSymbolicLink()) {
          // Skip symbolic links to prevent circular recursion
          continue;
        }

        if (stat.isDirectory()) {
          // Track inodes to detect circular symlinks (if we decide to follow them)
          const ino = stat.ino;
          if (visitedInodes.has(ino)) {
            continue; // Skip already visited inode
          }
          visitedInodes.add(ino);
          await walk(fullPath, visitedInodes);
        } else if (stat.isFile()) {
          const relativePath = path
            .relative(folderPath, fullPath)
            .replace(/\\/g, "/");
          const blobName = `${videoId}/${relativePath}`;

          // Upload to Azure Blob Storage using stream
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          const readStream = fs.createReadStream(fullPath);
          await blockBlobClient.uploadStream(readStream, undefined, undefined, {
            blobHTTPHeaders: { blobContentType: getMimeType(relativePath) },
          });

          // Store blob path (no SAS)
          uploadedMap[blobName] = blobName;
        }
      }
    };

    await walk(folderPath);
    return uploadedMap;
  } catch (error) {
    throw error;
  }
};

const getMimeType = (file) => {
  if (file.endsWith(".ts")) return "video/MP2T";
  if (file.endsWith(".m3u8")) return "application/x-mpegURL";
  if (file.endsWith(".jpg")) return "image/jpeg";
  return "application/octet-stream";
};
