import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { commentService } from "../services/comment.service.js";
import { ApiError } from "../utils/ApiError.js";

const MAX_LIMIT = 100;

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);

  // Validate and clamp pagination parameters
  const page = !Number.isNaN(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = !Number.isNaN(rawLimit) && rawLimit > 0 ? Math.min(MAX_LIMIT, rawLimit) : 10;

  const comments = await commentService.getVideoComments(videoId, page, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Content is required"));
  }

  // Trim content before storing to prevent whitespace-only comments
  const trimmedContent = content.trim();

  const comment = await commentService.addComment(
    videoId,
    req.user._id,
    trimmedContent
  );

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Content is required"));
  }

  const comment = await commentService.updateComment(
    commentId,
    req.user._id,
    content
  );

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  await commentService.deleteComment(commentId, req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
