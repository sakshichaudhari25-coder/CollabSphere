import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import File from "../models/File.js";
import Project from "../models/Project.js";
import { uploadsDirectory } from "../config/uploadStorage.js";
import { logProjectActivity } from "../utils/activityLogger.js";

const hasProjectAccess=(project,userId)=>
    project.owner.toString()===userId||
    project.members.some((member)=>member.toString()===userId)

const sendProjectAccessError=(res,error)=>{
    if(error==="invalid"){
        return res.status(400).json({message:"Invalid project ID"})
    }
    if(error==="missing"){
        return res.status(404).json({message:"Project not found"})
    }
    return res.status(403).json({message:"Access denied"})
}

export const requireProjectMember=async(req,res,next)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.projectId)){
            return sendProjectAccessError(res,"invalid")
        }

        const project=await Project.findById(req.params.projectId)
        if(!project){
            return sendProjectAccessError(res,"missing")
        }
        if(!hasProjectAccess(project,req.userId)){
            return sendProjectAccessError(res,"forbidden")
        }

        req.project=project
        next()
    }catch(error){
        console.error("Verify file project access error:",error.message)
        return res.status(500).json({
            message:"Unable to verify project access"
        })
    }
}

const getSafeStoredPath=(file)=>{
    const storedPath=path.resolve(file.path)
    const relativePath=path.relative(uploadsDirectory,storedPath)
    if(
        !relativePath||
        relativePath.startsWith("..")||
        path.isAbsolute(relativePath)||
        path.basename(relativePath)!==file.filename
    ){
        return null
    }
    return storedPath
}

const populateUploader=(query)=>query.populate("uploadedBy","name email")
const toPublicFile=(file)=>{
    const publicFile=file.toObject()
    delete publicFile.path
    return publicFile
}

export const listProjectFiles=async(req,res)=>{
    try{
        const files=await populateUploader(
            File.find({project:req.project._id}).sort({createdAt:-1})
        )
        return res.status(200).json({
            count:files.length,
            files:files.map(toPublicFile)
        })
    }catch(error){
        console.error("List project files error:",error.message)
        return res.status(500).json({
            message:"Failed to load project files"
        })
    }
}

export const uploadProjectFile=async(req,res)=>{
    try{
        if(!req.file){
            return res.status(400).json({message:"Select a file to upload"})
        }

        const file=await File.create({
            filename:req.file.filename,
            originalName:path.basename(req.file.originalname.replace(/\\/g,"/")),
            path:req.file.path,
            mimeType:req.file.mimetype,
            size:req.file.size,
            project:req.project._id,
            uploadedBy:req.userId,
        })

        await logProjectActivity({
            projectId:req.project._id,
            userId:req.userId,
            type:"file_uploaded",
            description:`Uploaded file "${file.originalName}"`,
            relatedEntityId:file._id,
            eventKey:`file_uploaded:${file._id}`,
        })

        await file.populate("uploadedBy","name email")
        return res.status(201).json({
            message:"File uploaded successfully!",
            file:toPublicFile(file)
        })
    }catch(error){
        if(req.file?.path){
            try{
                await fs.unlink(req.file.path)
            }catch(cleanupError){
                if(cleanupError.code!=="ENOENT"){
                    console.error("Failed to clean up unrecorded upload:",cleanupError.message)
                }
            }
        }
        console.error("Upload project file error:",error.message)
        return res.status(500).json({
            message:"File upload failed"
        })
    }
}

export const downloadProjectFile=async(req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.fileId)){
            return res.status(400).json({message:"Invalid file ID"})
        }

        const file=await File.findOne({
            _id:req.params.fileId,
            project:req.project._id
        })
        if(!file){
            return res.status(404).json({message:"File not found"})
        }

        const storedPath=getSafeStoredPath(file)
        if(!storedPath){
            console.error("Rejected unsafe stored file path",{
                fileId:file._id.toString()
            })
            return res.status(500).json({
                message:"File storage path is invalid"
            })
        }

        try{
            await fs.access(storedPath)
        }catch(error){
            if(error.code==="ENOENT"){
                return res.status(404).json({
                    message:"File is missing from server storage"
                })
            }
            throw error
        }

        res.type(file.mimeType||"application/octet-stream")
        return res.download(storedPath,file.originalName,(error)=>{
            if(error&&!res.headersSent){
                console.error("Download project file error:",error.message)
                res.status(500).json({message:"Failed to download file"})
            }
        })
    }catch(error){
        console.error("Download project file error:",error.message)
        if(!res.headersSent){
            return res.status(500).json({message:"Failed to download file"})
        }
    }
}

export const deleteProjectFile=async(req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.fileId)){
            return res.status(400).json({message:"Invalid file ID"})
        }

        const file=await File.findOne({
            _id:req.params.fileId,
            project:req.project._id
        })
        if(!file){
            return res.status(404).json({message:"File not found"})
        }
        if(
            file.uploadedBy.toString()!==req.userId&&
            req.project.owner.toString()!==req.userId
        ){
            return res.status(403).json({
                message:"Only the uploader or project owner can delete this file"
            })
        }

        const storedPath=getSafeStoredPath(file)
        if(!storedPath){
            console.error("Rejected unsafe stored file path during delete",{
                fileId:file._id.toString()
            })
            return res.status(500).json({
                message:"File storage path is invalid"
            })
        }

        try{
            await fs.unlink(storedPath)
        }catch(error){
            if(error.code!=="ENOENT"){
                throw error
            }
        }

        await file.deleteOne()
        await logProjectActivity({
            projectId:req.project._id,
            userId:req.userId,
            type:"file_deleted",
            description:`Deleted file "${file.originalName}"`,
            relatedEntityId:file._id,
            eventKey:`file_deleted:${file._id}`,
        })
        return res.status(200).json({
            message:"File deleted successfully!"
        })
    }catch(error){
        console.error("Delete project file error:",error.message)
        return res.status(500).json({
            message:"Failed to delete file"
        })
    }
}