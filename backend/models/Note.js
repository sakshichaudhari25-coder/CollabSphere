import mongoose from "mongoose";

const noteSchema=new mongoose.Schema(
    {
        title:{
            type:String,
            required:true,
            trim:true,
            maxlength:150
        },
        content:{
            type:String,
            required:true,
            maxlength:50000
        },
        project:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Project",
            required:true
        },
        author:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true
        }
    },
    {timestamps:true}
)

const Note=mongoose.model("Note",noteSchema)
export default Note
