import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    assistWithNote,
    assistWithProject
} from "../controllers/geminiController.js";

const router=express.Router();

router.use(authMiddleware);
router.post("/projects/:projectId/note-assistant",assistWithNote);
router.post("/projects/:projectId/assistant",assistWithProject);

export default router;