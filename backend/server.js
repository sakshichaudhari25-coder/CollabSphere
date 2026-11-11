import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"
import projectRouter from "./routes/projectRoutes.js";
import fileRoute from "./routes/fileRoutes.js"
import geminiRoutes from "./routes/geminiRoutes.js"

const app = express();
app.use(express.json())

const allowedOrigins=(process.env.FRONTEND_ORIGINS||"http://localhost:5173")
  .split(",")
  .map((origin)=>origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin,callback) => {
      if(!origin||allowedOrigins.includes(origin)){
        return callback(null,true)
      }
      return callback(null,false)
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.get("/",(req,res)=>{
    res.json({
        message:"Welcome to CollabSphere API"
    })
})


app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRouter)
app.use("/api/files", fileRoute)
app.use("/api/ai", geminiRoutes)


const startServer = async () => {
  try{
  if(!process.env.JWT_SECRET){
    throw new Error("JWT_SECRET is missing from the backend environment")
  }

  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`CollabSphere Server running on port ${PORT}`);
  });
}catch (error){
  console.error("Failed to start server:",error.message);
  
}
}
startServer();
