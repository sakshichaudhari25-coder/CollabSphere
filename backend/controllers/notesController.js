import mongoose from "mongoose";
import Note from "../models/Note.js";
import Project from "../models/Project.js";
import { logProjectActivity } from "../utils/activityLogger.js";

const isProjectMember=(project,userId)=>
    project.owner.toString()===userId||
    project.members.some((member)=>member.toString()===userId)

const findAccessibleProject=async(projectId,userId)=>{
    if(!mongoose.isValidObjectId(projectId)){
        return {error:"invalid"}
    }

    const project=await Project.findById(projectId)
    if(!project){
        return {error:"missing"}
    }

    if(!isProjectMember(project,userId)){
        return {error:"forbidden"}
    }

    return {project}
}

const sendProjectAccessError=(res,error)=>{
    if(error==="invalid"){
        return res.status(400).json({message:"Invalid project ID"})
    }
    if(error==="missing"){
        return res.status(404).json({message:"Project not found"})
    }
    return res.status(403).json({message:"Access denied"})
}

export const getProjectNotes=async(req,res)=>{
    try{
        const access=await findAccessibleProject(req.params.projectId,req.userId)
        if(access.error){
            return sendProjectAccessError(res,access.error)
        }

        const notes=await Note.find({project:access.project._id})
            .populate("author","name email")
            .sort({createdAt:-1})

        return res.status(200).json({
            count:notes.length,
            notes
        })
    }catch(error){
        console.error("Get project notes error:",error.message)
        return res.status(500).json({
            message:"Server error while fetching project notes"
        })
    }
}

export const createProjectNote=async(req,res)=>{
    try{
        const access=await findAccessibleProject(req.params.projectId,req.userId)
        if(access.error){
            return sendProjectAccessError(res,access.error)
        }

        const{title,content}=req.body||{}
        if(
            typeof title!=="string"||
            !title.trim()||
            title.trim().length>150||
            typeof content!=="string"||
            !content.trim()||
            content.length>50000
        ){
            return res.status(400).json({
                message:"A title of 1-150 characters and Markdown content of 1-50000 characters are required"
            })
        }

        const note=await Note.create({
            title:title.trim(),
            content,
            project:access.project._id,
            author:req.userId
        })

        await logProjectActivity({
            projectId:access.project._id,
            userId:req.userId,
            type:"note_created",
            description:`Created note "${note.title}"`,
            relatedEntityId:note._id,
            eventKey:`note_created:${note._id}`,
        })

        await note.populate("author","name email")
        return res.status(201).json({
            message:"Note created successfully!",
            note
        })
    }catch(error){
        console.error("Create project note error:",error.message)
        return res.status(500).json({
            message:"Server error while creating note"
        })
    }
}

export const updateProjectNote=async(req,res)=>{
    try{
        const access=await findAccessibleProject(req.params.projectId,req.userId)
        if(access.error){
            return sendProjectAccessError(res,access.error)
        }
        if(!mongoose.isValidObjectId(req.params.noteId)){
            return res.status(400).json({message:"Invalid note ID"})
        }

        const note=await Note.findOne({
            _id:req.params.noteId,
            project:access.project._id
        })
        if(!note){
            return res.status(404).json({message:"Note not found"})
        }
        if(
            note.author.toString()!==req.userId&&
            access.project.owner.toString()!==req.userId
        ){
            return res.status(403).json({
                message:"Only the note author or project owner can edit this note"
            })
        }

        const{title,content}=req.body||{}
        if(
            (title!==undefined&&
                (typeof title!=="string"||
                    !title.trim()||
                    title.trim().length>150))||
            (content!==undefined&&
                (typeof content!=="string"||
                    !content.trim()||
                    content.length>50000))
        ){
            return res.status(400).json({
                message:"Title must be 1-150 characters and Markdown content must be 1-50000 characters"
            })
        }
        if(title===undefined&&content===undefined){
            return res.status(400).json({
                message:"Provide a title or content to update"
            })
        }

        if(title!==undefined){
            note.title=title.trim()
        }
        if(content!==undefined){
            note.content=content
        }

        await note.save()
        await logProjectActivity({
            projectId:access.project._id,
            userId:req.userId,
            type:"note_updated",
            description:`Updated note "${note.title}"`,
            relatedEntityId:note._id,
        })
        await note.populate("author","name email")
        return res.status(200).json({
            message:"Note updated successfully!",
            note
        })
    }catch(error){
        console.error("Update project note error:",error.message)
        return res.status(500).json({
            message:"Server error while updating note"
        })
    }
}

export const deleteProjectNote=async(req,res)=>{
    try{
        const access=await findAccessibleProject(req.params.projectId,req.userId)
        if(access.error){
            return sendProjectAccessError(res,access.error)
        }
        if(!mongoose.isValidObjectId(req.params.noteId)){
            return res.status(400).json({message:"Invalid note ID"})
        }

        const note=await Note.findOne({
            _id:req.params.noteId,
            project:access.project._id
        })
        if(!note){
            return res.status(404).json({message:"Note not found"})
        }
        if(
            note.author.toString()!==req.userId&&
            access.project.owner.toString()!==req.userId
        ){
            return res.status(403).json({
                message:"Only the note author or project owner can delete this note"
            })
        }

        await note.deleteOne()
        await logProjectActivity({
            projectId:access.project._id,
            userId:req.userId,
            type:"note_deleted",
            description:`Deleted note "${note.title}"`,
            relatedEntityId:note._id,
            eventKey:`note_deleted:${note._id}`,
        })
        return res.status(200).json({
            message:"Note deleted successfully!"
        })
    }catch(error){
        console.error("Delete project note error:",error.message)
        return res.status(500).json({
            message:"Server error while deleting note"
        })
    }
}
