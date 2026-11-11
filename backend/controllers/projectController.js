import mongoose from "mongoose";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Activity from "../models/Activity.js";
import { logProjectActivity } from "../utils/activityLogger.js";

export const createProject=async(req,res)=>{
    try{
        const{name,description}=req.body

        if(typeof name !== "string"||!name.trim()){
            return res.status(400).json({
                message:"Praject name is required"
            })
        }

        const project = await Project.create({
            name:name.trim(),
            description:
                typeof description ==="string"? description.trim():"",
            owner:req.userId,
            members:[req.userId]
        })

        await logProjectActivity({
            projectId:project._id,
            userId:req.userId,
            type:"project_created",
            description:`Created project "${project.name}"`,
            relatedEntityId:project._id,
            eventKey:`project_created:${project._id}`,
        })

        return res.status(201).json({
            message:"Project created successfully!",
            project
        })
    }catch (error){
        console.error("Create Project error:", error.message);

        return res.status(500).json({
            message:"Server error while creating Project"
        })        
    }
}

export const getMyProject=async(req,res)=>{
    try{
        const projects=await Project.find({
            members:req.userId
        }).sort({createdAt:-1})

        return res.status(200).json({
            count:projects.length,
            projects
        })
    }catch (error){
        console.error("Get projects error:", error.message);

        return res.status(500).json({
            message:"Server error while fetching projects"
        })
        
    }
}

export const updateProject=async(req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.projectId)){
            return res.status(400).json({
                message:"Invalid project ID"
            })
        }

        const{name,description}=req.body || {}

        if(
            (name !== undefined &&
                (typeof name !== "string" ||
                    !name.trim() ||
                    name.trim().length>100)) ||
            (description !== undefined &&
                (typeof description !== "string" ||
                    description.trim().length>2000))
        ){
            return res.status(400).json({
                message:"Project name must be 1-100 characters and description must be 2000 characters or fewer"
            })
        }

        if(name === undefined && description === undefined){
            return res.status(400).json({
                message:"Provide a project name or description to update"
            })
        }

        const project=await Project.findOne({
            _id:req.params.projectId,
            owner:req.userId
        })

        if(!project){
            return res.status(404).json({
                message:"Project not found"
            })
        }

        if(name !== undefined){
            project.name=name.trim()
        }
        if(description !== undefined){
            project.description=description.trim()
        }

        await project.save()

        await logProjectActivity({
            projectId:project._id,
            userId:req.userId,
            type:"project_updated",
            description:`Updated project "${project.name}"`,
            relatedEntityId:project._id,
        })

        return res.status(200).json({
            message:"Project updated successfully!",
            project
        })
    }catch(error){
        console.error("Update project error:",error.message)

        return res.status(500).json({
            message:"Server error while updating project"
        })
    }
}

export const deleteProject=async(req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.projectId)){
            return res.status(400).json({
                message:"Invalid project ID"
            })
        }

        const project=await Project.findOne({
            _id:req.params.projectId,
            owner:req.userId
        })

        if(!project){
            return res.status(404).json({
                message:"Project not found"
            })
        }

        await logProjectActivity({
            projectId:project._id,
            userId:req.userId,
            type:"project_deleted",
            description:`Deleted project "${project.name}"`,
            relatedEntityId:project._id,
            eventKey:`project_deleted:${project._id}`,
        })
        await Activity.deleteMany({
            project:project._id,
            type:{$ne:"project_deleted"},
        })
        await project.deleteOne()

        return res.status(200).json({
            message:"Project deleted successfully!"
        })
    }catch(error){
        console.error("Delete project error:",error.message)

        return res.status(500).json({
            message:"Server error while deleting project"
        })
    }
}

export const getProjectMembers=async(req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.projectId)){
            return res.status(400).json({
                message:"Invalid project ID"
            })
        }

        const project=await Project.findById(req.params.projectId)
            .populate("members","name email")

        if(!project){
            return res.status(404).json({
                message:"Project not found"
            })
        }

        const hasAccess=project.owner.toString()===req.userId||
            project.members.some(
                (member)=>member?._id.toString()===req.userId
            )

        if(!hasAccess){
            return res.status(403).json({
                message:"Access denied"
            })
        }

        return res.status(200).json({
            members:project.members.filter(Boolean)
        })
    }catch(error){
        console.error("Get project members error:",error.message)

        return res.status(500).json({
            message:"Server error while fetching project members"
        })
    }
}

export const inviteProjectMember=async(req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.projectId)){
            return res.status(400).json({
                message:"Invalid project ID"
            })
        }

        const{email}=req.body || {}
        if(
            typeof email!=="string"||
            email.trim().length>254||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ){
            return res.status(400).json({
                message:"Enter a valid email address"
            })
        }

        const project=await Project.findOne({
            _id:req.params.projectId,
            owner:req.userId
        })

        if(!project){
            return res.status(404).json({
                message:"Project not found"
            })
        }

        const user=await User.findOne({
            email:email.trim().toLowerCase()
        }).select("_id name email")

        if(!user){
            return res.status(404).json({
                message:"No registered user was found with that email"
            })
        }

        if(project.members.some(
            (member)=>member.toString()===user._id.toString()
        )){
            return res.status(409).json({
                message:"This user is already a project member"
            })
        }

        const updatedProject=await Project.findOneAndUpdate(
            {
                _id:req.params.projectId,
                owner:req.userId,
                members:{$ne:user._id}
            },
            {$addToSet:{members:user._id}},
            {new:true}
        ).populate("members","name email")

        if(!updatedProject){
            const currentProject=await Project.findOne({
                _id:req.params.projectId,
                owner:req.userId
            })

            if(!currentProject){
                return res.status(404).json({
                    message:"Project not found"
                })
            }

            return res.status(409).json({
                message:"This user is already a project member"
            })
        }

        await logProjectActivity({
            projectId:updatedProject._id,
            userId:req.userId,
            type:"member_invited",
            description:`Invited ${user.name||user.email} to the project`,
            relatedEntityId:user._id,
        })

        return res.status(200).json({
            message:"Member invited successfully!",
            members:updatedProject.members.filter(Boolean)
        })
    }catch(error){
        console.error("Invite project member error:",error.message)

        return res.status(500).json({
            message:"Server error while inviting project member"
        })
    }
}

export const removeProjectMember=async(req,res)=>{
    try{
        const{projectId,memberId}=req.params
        if(
            !mongoose.isValidObjectId(projectId)||
            !mongoose.isValidObjectId(memberId)
        ){
            return res.status(400).json({
                message:"Invalid project or member ID"
            })
        }

        const project=await Project.findOne({
            _id:projectId,
            owner:req.userId
        })

        if(!project){
            return res.status(404).json({
                message:"Project not found"
            })
        }

        if(project.owner.toString()===memberId){
            return res.status(400).json({
                message:"The project owner cannot be removed"
            })
        }

        if(!project.members.some(
            (member)=>member.toString()===memberId
        )){
            return res.status(404).json({
                message:"Project member not found"
            })
        }

        const removedMember=await User.findById(memberId).select("name email")
        const updatedProject=await Project.findOneAndUpdate(
            {
                _id:projectId,
                owner:req.userId,
                members:memberId
            },
            {$pull:{members:memberId}},
            {new:true}
        ).populate("members","name email")

        if(!updatedProject){
            return res.status(404).json({
                message:"Project member not found"
            })
        }

        await logProjectActivity({
            projectId:updatedProject._id,
            userId:req.userId,
            type:"member_removed",
            description:`Removed ${removedMember?.name||removedMember?.email||"a member"} from the project`,
            relatedEntityId:memberId,
        })

        return res.status(200).json({
            message:"Member removed successfully!",
            members:updatedProject.members.filter(Boolean)
        })
    }catch(error){
        console.error("Remove project member error:",error.message)

        return res.status(500).json({
            message:"Server error while removing project member"
        })
    }
}