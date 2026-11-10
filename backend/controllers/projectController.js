import Project from "../models/Project.js";

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