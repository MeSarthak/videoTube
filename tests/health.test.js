import { jest } from "@jest/globals";

// Mock modules to prevent side-effects during testing
jest.unstable_mockModule("../src/queues/video.queue.js", () => ({
  addVideoToQueue: jest.fn(),
  videoQueue: { add: jest.fn() },
}));

// Mock the SAS token service to avoid Azure connection requirement
jest.unstable_mockModule("../src/services/sas-token.service.js", () => ({
  sasTokenService: {
    generateReadSASUrl: jest.fn(),
    generateWriteSASUrl: jest.fn(),
    generateHLSPlaylistSASUrl: jest.fn(),
    validateSASTokenExpiry: jest.fn(),
    generateCustomSASUrl: jest.fn(),
  },
}));

// Dynamic imports are required when using unstable_mockModule
const request = (await import("supertest")).default;
const app = (await import("../src/app.js")).default;

describe("Health Check", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/health-check");
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual("API is running...");
  });
});
