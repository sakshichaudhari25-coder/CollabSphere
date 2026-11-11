import express from "express"
import {
    createProject,
    getMyProject,
    updateProject,
    deleteProject,
    getProjectMembers,
    inviteProjectMember,
    removeProjectMember
} from "../controllers/projectController.js"
import {
    getProjectNotes,
    createProjectNote,
    updateProjectNote,
    deleteProjectNote
} from "../controllers/notesController.js"
import {
    getProjectActivities,
    getProjectAnalytics
} from "../controllers/analyticsController.js"

import authMiddleware from "../middleware/authMiddleware.js"

const router =express.Router()

router.post("/", authMiddleware,createProject);
router.get("/",authMiddleware,getMyProject)
router.put("/:projectId",authMiddleware,updateProject)
router.delete("/:projectId",authMiddleware,deleteProject)
router.get("/:projectId/members",authMiddleware,getProjectMembers)
router.post("/:projectId/members",authMiddleware,inviteProjectMember)
router.delete("/:projectId/members/:memberId",authMiddleware,removeProjectMember)
router.get("/:projectId/notes",authMiddleware,getProjectNotes)
router.post("/:projectId/notes",authMiddleware,createProjectNote)
router.put("/:projectId/notes/:noteId",authMiddleware,updateProjectNote)
router.delete("/:projectId/notes/:noteId",authMiddleware,deleteProjectNote)
router.get("/:projectId/analytics",authMiddleware,getProjectAnalytics)
router.get("/:projectId/activities",authMiddleware,getProjectActivities)

export default router;