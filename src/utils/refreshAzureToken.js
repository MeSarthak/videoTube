import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

/**
 * Generates a fresh SAS URL valid for 1 hour
 * Use this in your code instead of static SAS tokens
 */
export async function getRefreshableBlobUrl(blobName) {
  try {
    // Validate blobName
    if (!blobName || typeof blobName !== "string" || blobName.trim() === "") {
      throw new Error("Invalid blobName: must be a non-empty string");
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.CONTAINER_NAME || "videos";

    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Generate SAS URL valid for 1 hour with read-only permissions
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 1);

    const sasUrl = await blockBlobClient.generateSasUrl({
      expiresOn: expiresOn,
      permissions: BlobSASPermissions.parse("r"), // read-only
    });

    return sasUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * Alternative: Use this if you have storage account key
 * Add AZURE_STORAGE_ACCOUNT_KEY to your .env
 */
export function generateSASTokenFromKey() {
  try {
    const accountName = process.env.STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.CONTAINER_NAME || "videos";

    if (!accountName || !accountKey) {
      throw new Error(
        "STORAGE_ACCOUNT_NAME or AZURE_STORAGE_ACCOUNT_KEY is not set"
      );
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 1); // Valid for 1 hour

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: containerName,
        permissions: BlobSASPermissions.parse("r"), // read-only
        expiresOn: expiresOn,
      },
      sharedKeyCredential
    ).toString();

    return `https://${accountName}.blob.core.windows.net/${containerName}/?${sasToken}`;
  } catch (error) {
    throw error;
  }
}
