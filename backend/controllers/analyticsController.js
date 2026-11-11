import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import File from "../models/File.js";
import Note from "../models/Note.js";
import Project from "../models/Project.js";
import User from "../models/User.js";

const activityTypes=[
    "project_created",
    "project_updated",
    "project_deleted",
    "member_invited",
    "member_removed",
    "note_created",
    "note_updated",
    "note_deleted",
    "file_uploaded",
    "file_deleted",
    "ai_note_assistant",
    "ai_project_assistant",
]

export const getProjectAnalytics=async(req,res)=>{
    try{
        const{projectId}=req.params
        if(!mongoose.isValidObjectId(projectId)){
            return res.status(400).json({message:"Invalid project ID"})
        }

        const project=await Project.findById(projectId)
            .populate("members","name email")
        if(!project){
            return res.status(404).json({message:"Project not found"})
        }
        if(
            project.owner.toString()!==req.userId&&
            !project.members.some((member)=>member?._id.toString()===req.userId)
        ){
            return res.status(403).json({message:"Access denied"})
        }

        const requestedType=req.query.type||"all"
        if(requestedType!=="all"&&!activityTypes.includes(requestedType)){
            return res.status(400).json({message:"Invalid activity type filter"})
        }

        const memberIds=[...new Set([
            project.owner.toString(),
            ...project.members.filter(Boolean).map((member)=>member._id.toString()),
        ])]
        const projectFilter={
            $or:[{owner:req.userId},{members:req.userId}],
        }
        const activityStartDate=new Date()
        activityStartDate.setUTCHours(0,0,0,0)
        activityStartDate.setUTCDate(activityStartDate.getUTCDate()-13)
        const [
            totalProjects,
            totalNotes,
            totalFiles,
            totalActivities,
            contributions,
            distribution,
            dailyCounts,
        ]=await Promise.all([
            Project.countDocuments(projectFilter),
            Note.countDocuments({project:project._id}),
            File.countDocuments({project:project._id}),
            Activity.countDocuments({project:project._id}),
            Activity.aggregate([
                {$match:{project:project._id}},
                {$group:{_id:"$user",contributions:{$sum:1}}},
            ]),
            Activity.aggregate([
                {$match:{project:project._id}},
                {$group:{_id:"$type",count:{$sum:1}}},
                {$sort:{count:-1,_id:1}},
            ]),
            Activity.aggregate([
                {$match:{
                    project:project._id,
                    createdAt:{$gte:activityStartDate},
                }},
                {$group:{
                    _id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt",timezone:"UTC"}},
                    count:{$sum:1},
                }},
            ]),
        ])

        const contributionCounts=new Map(
            contributions.map((item)=>[item._id.toString(),item.contributions])
        )
        const contributionUserIds=[...new Set([
            ...memberIds,
            ...contributions.map((item)=>item._id.toString()),
        ])]
        const contributionUsers=await User.find({
            _id:{$in:contributionUserIds},
        }).select("name email").lean()
        const memberUsers=new Map(contributionUsers.map((user)=>[
            user._id.toString(),
            {name:user.name,email:user.email},
        ]))
        const memberContributions=contributionUserIds.map((id)=>({
            userId:id,
            name:memberUsers.get(id)?.name||"Unknown member",
            email:memberUsers.get(id)?.email||"",
            contributions:contributionCounts.get(id)||0,
        })).sort((a,b)=>b.contributions-a.contributions||a.name.localeCompare(b.name))

        const dailyCountMap=new Map(dailyCounts.map((item)=>[item._id,item.count]))
        const activityOverTime=Array.from({length:14},(_,index)=>{
            const date=new Date()
            date.setUTCHours(0,0,0,0)
            date.setUTCDate(date.getUTCDate()-(13-index))
            const key=date.toISOString().slice(0,10)
            return {date:key,count:dailyCountMap.get(key)||0}
        })

        const timelineFilter={project:project._id}
        if(requestedType!=="all"){
            timelineFilter.type=requestedType
        }
        const activities=await Activity.find(timelineFilter)
            .populate("user","name email")
            .sort({createdAt:-1,_id:-1})
            .limit(50)
            .lean()

        return res.status(200).json({
            summary:{
                totalProjects,
                totalMembers:memberIds.length,
                totalNotes,
                totalFiles,
                totalActivities,
            },
            memberContributions,
            activityDistribution:distribution.map(({_id,count})=>({
                type:_id,
                count,
            })),
            activityOverTime,
            activities,
        })
    }catch(error){
        console.error("Project analytics request failed:",error.message)
        return res.status(500).json({
            message:"Unable to load project analytics",
        })
    }
}

export const getProjectActivities=async(req,res)=>{
    try{
        const{projectId}=req.params
        if(!mongoose.isValidObjectId(projectId)){
            return res.status(400).json({message:"Invalid project ID"})
        }

        const project=await Project.findById(projectId).select("owner members")
        if(!project){
            return res.status(404).json({message:"Project not found"})
        }
        if(
            project.owner.toString()!==req.userId&&
            !project.members.some((member)=>member.toString()===req.userId)
        ){
            return res.status(403).json({message:"Access denied"})
        }

        const requestedType=req.query.type||"all"
        if(requestedType!=="all"&&!activityTypes.includes(requestedType)){
            return res.status(400).json({message:"Invalid activity type filter"})
        }

        const filter={project:project._id}
        if(requestedType!=="all"){
            filter.type=requestedType
        }
        const activities=await Activity.find(filter)
            .populate("user","name email")
            .sort({createdAt:-1,_id:-1})
            .limit(50)
            .lean()

        return res.status(200).json({activities})
    }catch(error){
        console.error("Project activity request failed:",error.message)
        return res.status(500).json({
            message:"Unable to load project activities",
        })
    }
}
