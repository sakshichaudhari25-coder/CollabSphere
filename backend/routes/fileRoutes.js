
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import File from "../models/File.js";
import Project from "../models/Project.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const uploadedFolder = "uploads";

if (!fs.existsSync(uploadedFolder)) {
  fs.mkdirSync(uploadedFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadedFolder);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/:projectId/:fileId", authMiddleware, async(req,res)=>{
  try{
    const project=await Project.findById(req.params.projectId);

    if(!project){
      return res.status(404).json({
        message:"Project not found",
      })
    }

    const isOwner=project.owner.toString()===req.userId;
    const isMember=project.members.some(
      (member)=>member.toString()===req.userId
    )

    if(!isOwner && !isMember){
      return res.status(403).json({
        message:"Access denied",
      })
    }

    const file=await File.findOne({
      _id:req.params.fileId,
      projectId:project._id,
    })

    if (!file){
      return res.status(404).json({
        message:"Files not found",
      })
    }

    const absolutePath=path.resolve(file.path);

    if(!fs.existsSync(absolutePath)){
      return res.status(404).json({
        message:"File is missing from server storage",
      })
    }

    if(req.query.download === "true"){
      return res.download(absolutePath, file.originalName)
    }

    return res.sendFile(absolutePath)
  }catch(error){
    console.error("Open file error:", error);

    return res.status(500).json({
      message:"Failed to open file",
    })
    }
  })

router.post("/:projectId",authMiddleware,upload.single("file"),async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId);

      if (!project) {
        return res.status(404).json({
          message: "Project not found.",
        });
      }

      const isOwner =project.owner.toString() === req.userId;

      const isMember = project.members.some(
        (member) => member.toString() === req.userId
      );

      if (!isOwner && !isMember) {
        return res.status(403).json({
          message: "Access denied.",
        });
      }

      const files = await File.find({
        project:project._id,
      }).sort({createAt:-1});
      
      


      const savedFile = await File.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        project: project._id,
        uploadedBy: req.userId,
      });

      return res.status(201).json({
        message: "File uploaded successfully!",
        file: savedFile,
      });
    } catch (error) {
      console.error("File upload error:", error);

      return res.status(500).json({
        message: "File upload failed.",
      });
    }
  }
);

export default router;
