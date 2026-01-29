import fs from "fs";
import path from "path";
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error(
    "AZURE_STORAGE_CONNECTION_STRING environment variable is not set"
  );
}

// Parse connection string manually to get account name and key for SAS generation
const parseConnectionString = (connStr) => {
  const parts = connStr.split(';').reduce((acc, part) => {
    const [key, ...valueParts] = part.split('=');
    if (key) acc[key] = valueParts.join('=');
    return acc;
  }, {});
  return parts;
};

const connStringParts = parseConnectionString(connectionString);
const accountName = connStringParts.AccountName || "";
const accountKey = connStringParts.AccountKey || "";

if (!accountName || !accountKey) {
  throw new Error("Failed to parse AccountName or AccountKey from connection string");
}

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);

const containerName = process.env.CONTAINER_NAME || "videos";
const isSecure = connectionString.includes("https"); // Basic check, Azure usually enforces HTTPS

const generateSASToken = (containerName, blobName) => {
  if (!accountName || !accountKey) return "";

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );
  const sasOptions = {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse("r"), // Read-only
    startsOn: new Date(new Date().valueOf() - 15 * 60 * 1000), // Start 15 mins ago to be safe
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000 * 24 * 7), // 7 days (increased from 24h)
    protocol: isSecure ? "https" : "https,http",
  };

  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    sharedKeyCredential
  ).toString();
  return sasToken;
};

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
          const relativePath = path
            .relative(folderPath, fullPath)
            .replace(/\\/g, "/");
          const blobName = `${videoId}/${relativePath}`;

          // Upload to Azure Blob Storage
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { blobContentType: getMimeType(relativePath) },
          });

          // Append SAS Token to the URL
          const sasToken = generateSASToken(containerName, blobName);
          uploadedMap[blobName] = `${blockBlobClient.url}?${sasToken}`;
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
  if (file.endsWith(".ts")) return "video/MP2T";
  if (file.endsWith(".m3u8")) return "application/x-mpegURL";
  if (file.endsWith(".jpg")) return "image/jpeg";
  return "application/octet-stream";
};
