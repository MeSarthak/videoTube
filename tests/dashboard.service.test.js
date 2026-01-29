import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { dashboardService } from "../src/services/dashboard.service.js";
import { Video } from "../src/models/video.model.js";
import { User } from "../src/models/user.model.js";
import { Like } from "../src/models/like.model.js";
import { Subscription } from "../src/models/subscription.model.js";
import { jest } from "@jest/globals";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe("Dashboard Service", () => {
  it("should correctly calculate channel stats", async () => {
    // 1. Create a dummy user (channel owner)
    const owner = await User.create({
      username: "testchannel",
      email: "test@example.com",
      password: "password123",
      fullname: "Test Channel",
      avatar: "http://example.com/avatar.jpg",
    });

    // 2. Create some videos for this owner
    const video1 = await Video.create({
      videoFile: "http://example.com/v1.mp4",
      thumbnail: "http://example.com/t1.jpg",
      owner: owner._id,
      title: "Video 1",
      description: "Desc 1",
      duration: 100,
      views: 10,
      isPublished: true,
    });

    const video2 = await Video.create({
      videoFile: "http://example.com/v2.mp4",
      thumbnail: "http://example.com/t2.jpg",
      owner: owner._id,
      title: "Video 2",
      description: "Desc 2",
      duration: 200,
      views: 25,
      isPublished: true,
    });

    // 3. Create another user (subscriber/liker)
    const user2 = await User.create({
      username: "viewer",
      email: "viewer@example.com",
      password: "password123",
      fullname: "Viewer User",
      avatar: "http://example.com/avatar2.jpg",
    });

    // 4. Add Likes
    await Like.create({ video: video1._id, likedBy: user2._id });
    await Like.create({ video: video2._id, likedBy: user2._id });
    // Add a like from the owner themselves
    await Like.create({ video: video1._id, likedBy: owner._id });

    // 5. Add Subscription
    await Subscription.create({ subscriber: user2._id, channel: owner._id });

    // 6. Run the service method
    const stats = await dashboardService.getChannelStats(owner._id);

    // 7. Assertions
    expect(stats.totalVideos).toBe(2);
    expect(stats.totalViews).toBe(10 + 25); // 35
    expect(stats.totalSubscribers).toBe(1);
    expect(stats.totalLikes).toBe(3);
  });

  it("should return zeros for a new channel", async () => {
    const newOwner = await User.create({
      username: "newbie",
      email: "new@example.com",
      password: "password123",
      fullname: "New User",
      avatar: "http://example.com/avatar3.jpg",
    });

    const stats = await dashboardService.getChannelStats(newOwner._id);

    expect(stats.totalVideos).toBe(0);
    expect(stats.totalViews).toBe(0);
    expect(stats.totalSubscribers).toBe(0);
    expect(stats.totalLikes).toBe(0);
  });

  it("should throw error for invalid user ID", async () => {
    await expect(
      dashboardService.getChannelStats("invalid-id")
    ).rejects.toThrow("Invalid User ID");
  });
});
