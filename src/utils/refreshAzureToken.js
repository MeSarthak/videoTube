import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from require("@azure/storage-blob");

/**
 * Generates a fresh SAS URL valid for 24 hours
 * Use this in your code instead of static SAS tokens
 */
export async function getRefreshableBlobUrl(blobName) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.CONTAINER_NAME || "videos";

    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Generate SAS URL valid for 24 hours
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 24);

    const sasUrl = await blockBlobClient.generateSasUrl({
      expiresOn: expiresOn,
      permissions: BlobSASPermissions.parse("racwd"), // read, add, create, write, delete
    });

    return sasUrl;
  } catch (error) {
    console.error("Error generating blob SAS URL:", error);
    throw error;
  }
}

/**
 * Alternative: Use this if you have storage account key
 * Add AZURE_STORAGE_ACCOUNT_KEY to your .env
 */
export function generateSASTokenFromKey() {
  try {
    const { StorageSharedKeyCredential } = require("@azure/storage-blob");
    
    const accountName = process.env.STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.CONTAINER_NAME || "videos";

    if (!accountName || !accountKey) {
      throw new Error("STORAGE_ACCOUNT_NAME or AZURE_STORAGE_ACCOUNT_KEY is not set");
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + 7); // Valid for 7 days

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: containerName,
        permissions: BlobSASPermissions.parse("racwd"),
        expiresOn: expiresOn,
      },
      sharedKeyCredential
    ).toString();

    return `https://${accountName}.blob.core.windows.net/?${sasToken}`;
  } catch (error) {
    console.error("Error generating SAS token:", error);
    throw error;
  }
}
