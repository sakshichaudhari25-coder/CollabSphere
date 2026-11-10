import mongoose from "mongoose";

const fileSchema=new mongoose.Schema(
    {
        filename:{
            type: String,
            required:true,
        },
        originalName:{
            type: String,
            reqruired:true
        },
        path:{
            type: String,
            required: true,
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