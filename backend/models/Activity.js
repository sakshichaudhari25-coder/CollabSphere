import mongoose from "mongoose";

const activitySchema=new mongoose.Schema(
    {
        eventKey:{
            type:String,
            required:true,
            unique:true,
        },
        project:{
            type:mongoose.Schema.Types.ObjectId,
            required:true,
            index:true,
        },
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        type:{
            type:String,
            enum:[
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
            ],
            required:true,
        },
        description:{
            type:String,
            required:true,
            trim:true,
            maxlength:300,
        },
        relatedEntityId:{
            type:mongoose.Schema.Types.ObjectId,
            default:null,
        },
    },
    {timestamps:true}
)

activitySchema.index({project:1,createdAt:-1})
activitySchema.index({project:1,user:1,createdAt:-1})

const Activity=mongoose.model("Activity",activitySchema)
export default Activity
