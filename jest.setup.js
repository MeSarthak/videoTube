/**
 * Jest Setup File
 * Loads environment variables before running tests
 */

import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Ensure required environment variables are set
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  console.warn("Warning: AZURE_STORAGE_CONNECTION_STRING is not set in environment");
}

// Add a small delay to ensure modules are initialized
await new Promise((resolve) => setTimeout(resolve, 100));
