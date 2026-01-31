/**
 * Jest Configuration
 * Configured for ESM modules with Node.js environment
 */

export default {
  testEnvironment: "node",
  transform: {},
  extensionsToTreatAsEsm: [".js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[tj]s?(x)",
    "**/tests/**/*.[jt]s?(x)",
  ],
  moduleNameMapper: {
    "^(\.{1,2}/.*)\.js$": "$1",
  },
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/app.js",
  ],
  testTimeout: 10000,
};
