# Backend Audit - Detailed Fix Implementation Guide

## 1. HIGH PRIORITY FIX: Remove Console.log Statements

**File**: `src/controllers/video.controller.js`

### BEFORE (Lines 6-9):
```javascript
const uploadHLSVideo = asyncHandler(async (req, res) => {
  console.log("Upload request received");
  console.log("req.files:", req.files);
  console.log("req.file:", req.file);
  console.log("req.body:", req.body);
  
  const ownerId = req.user._id;
```

### AFTER:
```javascript
const uploadHLSVideo = asyncHandler(async (req, res) => {
  // Logging moved to structured logger in production
  // logger.info("Upload request received", { userId: req.user._id });
  
  const ownerId = req.user._id;
```

**Additional Changes** (All files):
- Find all console.log/console.error and replace with structured logger
- Install: `npm install winston`
- Create `src/utils/logger.js`:

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export { logger };
```

---

## 2. HIGH PRIORITY FIX: Query Parameter Validation

**File**: `src/controllers/video.controller.js`

### Create validation file `src/validations/video.validation.js`:
```javascript
import Joi from 'joi';

export const getAllVideosSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  query: Joi.string().optional().max(255),
  sortBy: Joi.string()
    .valid('createdAt', 'views', 'mostLiked', 'mostViewed', 'duration')
    .default('createdAt'),
  sortType: Joi.string().valid('asc', 'desc').default('desc'),
  userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  tags: Joi.string().optional().max(500),
  uploadDate: Joi.string()
    .valid('today', 'week', 'month', 'year')
    .optional(),
  durationMin: Joi.number().min(0).optional(),
  durationMax: Joi.number().min(0).optional(),
});
```

### Update controller:
```javascript
import { getAllVideosSchema } from '../validations/video.validation.js';

const getAllVideos = asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = getAllVideosSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const result = await videoService.getAllVideos(value);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});
```

---

## 3. HIGH PRIORITY FIX: Array Null Check

**File**: `src/services/user.service.js`

### BEFORE (Line 326):
```javascript
async getWatchHistory(userId) {
  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    // ... pipeline ...
  ]);
  
  return user[0].watchHistory;  // ❌ CRASH if user is empty
}
```

### AFTER:
```javascript
async getWatchHistory(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    // ... pipeline ...
  ]);
  
  if (!user || !user[0]) {
    throw new ApiError(404, "User not found");
  }
  
  return user[0].watchHistory;
}
```

---

## 4. HIGH PRIORITY FIX: ObjectId Validation Utility

**Create** `src/utils/validators.js`:
```javascript
import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

export const validateObjectId = (id, fieldName = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }
  return new mongoose.Types.ObjectId(id);
};

export const validateObjectIds = (ids, fieldName = 'IDs') => {
  if (!Array.isArray(ids)) {
    throw new ApiError(400, `${fieldName} must be an array`);
  }
  return ids.map(id => validateObjectId(id, fieldName));
};
```

**Update services to use**:
```javascript
// Old way:
$match: { _id: new mongoose.Types.ObjectId(userId) }

// New way:
$match: { _id: validateObjectId(userId, 'User ID') }
```

---

## 5. HIGH PRIORITY FIX: Remove Optional Chaining in Protected Routes

**File**: `src/controllers/comment.controller.js`

### BEFORE:
```javascript
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  
  const comment = await commentService.addComment(
    videoId,
    req.user?._id,  // ❌ Optional chaining - req.user always exists!
    content
  );
```

### AFTER:
```javascript
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  
  const comment = await commentService.addComment(
    videoId,
    req.user._id,  // ✅ Direct access - guaranteed by middleware
    content
  );
```

**Apply same fix to**:
- `src/controllers/like.controller.js` (lines 7, 16, 24)
- `src/controllers/subscription.controller.js` (line 9)

---

## 6. HIGH PRIORITY FIX: Delete Operation Verification

**File**: `src/services/comment.service.js`

### BEFORE:
```javascript
async deleteComment(commentId, userId) {
  const comment = await Comment.findById(commentId);
  
  if (!comment) throw new ApiError(404, "Comment not found");
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized to delete this comment");
  }
  
  await Comment.findByIdAndDelete(commentId);
  return { deleted: true };  // ❌ Always true
}
```

### AFTER:
```javascript
async deleteComment(commentId, userId) {
  const comment = await Comment.findById(commentId);
  
  if (!comment) throw new ApiError(404, "Comment not found");
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized to delete this comment");
  }
  
  const deleted = await Comment.findByIdAndDelete(commentId);
  if (!deleted) {
    throw new ApiError(500, "Failed to delete comment");
  }
  return { deleted: true };
}
```

---

## 7. HIGH PRIORITY FIX: Better JWT Error Handling

**File**: `src/middlewares/auth.middleware.js`

### BEFORE:
```javascript
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Access token is missing");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "User not found");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");  // ❌ Generic
  }
});
```

### AFTER:
```javascript
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Access token is missing");
    }
    
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new ApiError(401, "Access token has expired");
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new ApiError(401, "Invalid access token");
      }
      throw jwtError;
    }
    
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "User not found");
    }
    req.user = user;
    next();
  } catch (error) {
    // Re-throw ApiErrors as-is
    if (error.statusCode) {
      throw error;
    }
    throw new ApiError(401, "Authentication failed");
  }
});
```

---

## 8. HIGH PRIORITY FIX: Memory Optimization for Large Li
