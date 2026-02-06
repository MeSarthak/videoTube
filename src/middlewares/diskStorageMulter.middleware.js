import multer from "multer";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { readFile, unlink } from "fs/promises";

// Allowed MIME types for uploads
const allowedMimes = {
  video: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"],
  image: ["image/jpeg", "image/png", "image/webp"],
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Handle files with no extension
    const ext = path.extname(file.originalname);
    const fileExtension = ext ? ext.substring(1) : ""; // Remove the dot if present
    const baseName = path.basename(file.originalname, ext);
    const filename = fileExtension 
      ? `${file.fieldname}-${uniqueSuffix}.${fileExtension}`
      : `${file.fieldname}-${uniqueSuffix}`;
    cb(null, filename);
  },
});

// File filter to validate MIME types against both declared and actual signatures
const fileFilter = async (req, file, cb) => {
  const fieldName = file.fieldname;
  const declaredMimeType = file.mimetype;
  
  let allowedMimeList = [];
  if (fieldName === "video") {
    allowedMimeList = allowedMimes.video;
  } else if (fieldName === "thumbnail") {
    allowedMimeList = allowedMimes.image;
  } else {
    // Allow other fields without MIME validation
    return cb(null, true);
  }

  // First check: validate declared MIME type
  if (!allowedMimeList.includes(declaredMimeType)) {
    return cb(new Error(`Invalid ${fieldName} MIME type: ${declaredMimeType}`), false);
  }

  // Second check: validate actual file signature using file-type library
  // This detects files with forged extensions or modified MIME types
  try {
    // file.buffer may not be available yet during parsing, so we need to check
    // For now, we check the declared MIME type. The actual signature validation
    // would happen in a post-upload middleware that reads the file.
    // Store declared MIME for later validation if needed.
    file.validatedMimeType = declaredMimeType;
    cb(null, true);
  } catch (err) {
    cb(new Error(`File signature validation failed: ${err.message}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
});

/**
 * Middleware to validate actual file signatures after upload.
 * This provides additional security against files with forged extensions.
 */
export const validateFileSignature = async (req, res, next) => {
  const files = [];

  if (req.file) {
    files.push(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else if (typeof req.files === "object") {
      Object.values(req.files).forEach((fileList) => {
        if (Array.isArray(fileList)) {
          files.push(...fileList);
        }
      });
    }
  }

  if (files.length === 0) {
    return next();
  }

  try {
    for (const file of files) {
      const fieldName = file.fieldname;
      let allowedMimeList = [];

      if (fieldName === "video") {
        allowedMimeList = allowedMimes.video;
      } else if (fieldName === "thumbnail") {
        allowedMimeList = allowedMimes.image;
      } else {
        continue; // Skip validation for other fields
      }

      // Detect real MIME type from file signature
      const detectedType = await fileTypeFromBuffer(await readFile(file.path));
      
      if (!detectedType || !allowedMimeList.includes(detectedType.mime)) {
        // Invalid file signature - remove the file
        await unlink(file.path).catch(() => {});
        return res.status(400).json({
          message: `Invalid ${fieldName} file. File signature does not match declared type.`,
        });
      }

      // Update MIME type to detected value for accurate handling
      file.mimetype = detectedType.mime;
    }

    next();
  } catch (err) {
    console.error("File signature validation error:", err);
    res.status(400).json({
      message: "File validation failed",
    });
  }
};
