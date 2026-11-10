import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"
import projectRouter from "./routes/projectRoutes.js";
import fileRoute from "./routes/fileRoutes.js"

dotenv.config();

const app = express();
app.use(express.json())

app.use(
  cors({
    origin: "http://localhost:5173",
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


const startServer = async () => {
  try{
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`CollabSphere Server running on port ${PORT}`);
  });
}catch (error){
  console.error("Filed to start server:",error.message);
  
}
}
startServer();
