import express from "express"
import {createProject,getMyProject} from "../controllers/projectController.js"

import authMiddleware from "../middleware/authMiddleware.js"

const router =express.Router()

router.post("/", authMiddleware,createProject);
router.get("/",authMiddleware,getMyProject)

export default router;