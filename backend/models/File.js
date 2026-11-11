import mongoose from "mongoose";

const fileSchema=new mongoose.Schema(
    {
        filename:{
            type: String,
            required:true,
        },
        originalName:{
            type: String,
            required:true,
        },
        path:{
            type: String,
            required: true,
        },
        mimeType:{
            type:String,
            required:true,
        },
        size:{
            type:Number,
            required:true,
            min:0,
        },
        project:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Project",
            required:true,
        },
        uploadedBy:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
    },
    {timestamps:true}
)

const File = mongoose.model("File", fileSchema)
export default File