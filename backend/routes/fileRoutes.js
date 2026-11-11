import crypto from "crypto";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadsDirectory } from "../config/uploadStorage.js";
import {
  deleteProjectFile,
  downloadProjectFile,
  listProjectFiles,
  requireProjectMember,
  uploadProjectFile,
} from "../controllers/fileController.js";

const router = express.Router();
const uploadedFolder = uploadsDirectory;
const maxFileSize = 5 * 1024 * 1024;
const allowedMimeTypes = {
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/x-markdown", "text/plain"],
  ".rtf": ["application/rtf", "text/rtf", "text/plain"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  ".csv": ["text/csv", "application/csv", "text/plain"],
  ".json": ["application/json", "text/json", "text/plain"],
  ".xml": ["application/xml", "text/xml", "text/plain"],
  ".yaml": ["application/yaml", "text/yaml", "text/plain"],
  ".yml": ["application/yaml", "text/yaml", "text/plain"],
  ".html": ["text/html", "text/plain"],
  ".css": ["text/css", "text/plain"],
  ".js": ["application/javascript", "text/javascript", "text/plain"],
  ".jsx": ["application/javascript", "text/javascript", "text/plain"],
  ".mjs": ["application/javascript", "text/javascript", "text/plain"],
  ".cjs": ["application/javascript", "text/javascript", "text/plain"],
  ".ts": ["application/typescript", "text/typescript", "text/plain"],
  ".tsx": ["application/typescript", "text/typescript", "text/plain"],
  ".py": ["text/x-python", "application/x-python", "text/plain"],
  ".java": ["text/x-java-source", "text/plain"],
  ".c": ["text/x-c", "text/plain"],
  ".h": ["text/x-c", "text/plain"],
  ".cpp": ["text/x-c++", "text/plain"],
  ".hpp": ["text/x-c++", "text/plain"],
  ".go": ["text/x-go", "text/plain"],
  ".rs": ["text/x-rust", "text/plain"],
  ".php": ["application/x-php", "text/plain"],
  ".rb": ["text/x-ruby", "text/plain"],
  ".sh": ["application/x-sh", "text/x-shellscript", "text/plain"],
  ".sql": ["application/sql", "text/sql", "text/plain"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
};

fs.mkdirSync(uploadedFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadedFolder);
  },
  filename: (_req, file, callback) => {
    callback(
      null,
      `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const acceptedMimeTypes = allowedMimeTypes[extension];

    if (!acceptedMimeTypes || !acceptedMimeTypes.includes(file.mimetype)) {
      const error = new Error(
        "Unsupported file type. Upload a supported document or code file."
      );
      error.status = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

const handleUploadError = (error, _req, res, next) => {
  if (!error) {
    return next();
  }
  if (error instanceof multer.MulterError) {
    return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "File must be 5 MB or smaller."
          : "Upload must contain exactly one valid file.",
    });
  }
  if (error.status === 400) {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
};

router.get(
  "/:projectId",
  authMiddleware,
  requireProjectMember,
  listProjectFiles
);
router.post(
  "/:projectId",
  authMiddleware,
  requireProjectMember,
  upload.single("file"),
  uploadProjectFile
);
router.get(
  "/:projectId/:fileId",
  authMiddleware,
  requireProjectMember,
  downloadProjectFile
);
router.delete(
  "/:projectId/:fileId",
  authMiddleware,
  requireProjectMember,
  deleteProjectFile
);
router.use(handleUploadError);

export default router;
