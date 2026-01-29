import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { notificationService } from "../src/services/notification.service.js";
import { Notification } from "../src/models/notification.model.js";
import { User } from "../src/models/user.model.js";

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

describe("Notification Service", () => {
  it("should create a notification if it does not exist", async () => {
    const sender = new mongoose.Types.ObjectId();
    const recipient = new mongoose.Types.ObjectId();
    const referenceId = new mongoose.Types.ObjectId();
    const type = "VIDEO_LIKE";

    const notif = await notificationService.createNotification({
      sender,
      recipient,
      type,
      referenceId,
    });

    expect(notif).toBeDefined();
    expect(notif.isRead).toBe(false);

    const count = await Notification.countDocuments();
    expect(count).toBe(1);
  });

  it("should not create a notification if sender is recipient", async () => {
    const userId = new mongoose.Types.ObjectId();
    const referenceId = new mongoose.Types.ObjectId();
    const type = "LIKE";

    const result = await notificationService.createNotification({
      sender: userId,
      recipient: userId, // Same as sender
      type,
      referenceId,
    });

    expect(result).toBeNull();
    const count = await Notification.countDocuments();
    expect(count).toBe(0);
  });

  it("should not create a duplicate unread notification (spam prevention)", async () => {
    const sender = new mongoose.Types.ObjectId();
    const recipient = new mongoose.Types.ObjectId();
    const referenceId = new mongoose.Types.ObjectId();
    const type = "VIDEO_LIKE";

    // First notification
    await notificationService.createNotification({
      sender,
      recipient,
      type,
      referenceId,
    });

    // Second identical notification (should simply update the first one)
    const secondCall = await notificationService.createNotification({
      sender,
      recipient,
      type,
      referenceId,
    });

    const count = await Notification.countDocuments();
    expect(count).toBe(1); // Still 1

    // The returned object should be the existing notification
    expect(secondCall._id).toBeDefined();
  });

  it("should create a new notification if the previous one was read", async () => {
    const sender = new mongoose.Types.ObjectId();
    const recipient = new mongoose.Types.ObjectId();
    const referenceId = new mongoose.Types.ObjectId();
    const type = "VIDEO_LIKE";

    // 1. Create and mark as read
    const firstNotif = await notificationService.createNotification({
      sender,
      recipient,
      type,
      referenceId,
    });

    await notificationService.markAsRead(firstNotif._id, recipient);

    // 2. Create again
    await notificationService.createNotification({
      sender,
      recipient,
      type,
      referenceId,
    });

    const count = await Notification.countDocuments();
    expect(count).toBe(2); // Should be 2 now
  });
});
