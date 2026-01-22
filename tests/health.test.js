import { jest } from "@jest/globals";

// Mock the queue module to prevent Redis connection side-effects
jest.unstable_mockModule("../src/queues/video.queue.js", () => ({
  addVideoToQueue: jest.fn(),
  videoQueue: { add: jest.fn() },
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
