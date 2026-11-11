import { randomUUID } from "crypto";
import Activity from "../models/Activity.js";

export const logProjectActivity=async({
    projectId,
    userId,
    type,
    description,
    relatedEntityId=null,
    eventKey=randomUUID(),
})=>{
    try{
        await Activity.updateOne(
            {eventKey},
            {
                $setOnInsert:{
                    eventKey,
                    project:projectId,
                    user:userId,
                    type,
                    description,
                    relatedEntityId,
                },
            },
            {upsert:true}
        )
    }catch(error){
        if(error.code===11000){
            return
        }
        console.error("Project activity logging failed:",{
            type,
            projectId:String(projectId),
            error:error.message,
        })
    }
}