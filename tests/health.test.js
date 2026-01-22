import request from "supertest";
import app from "../src/app.js";

describe("Health Check", () => {
  it("should return 200 OK", async () => {
    const res = await request(app).get("/health-check");
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual("API is running...");
  });
});
