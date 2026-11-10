import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"

export const registerUser=async(req,res)=>{
    try{
        const{name,email,password}=req.body;

        if(
            typeof name!=="string"||
            typeof email !== "string"||
            typeof password !== "string"||
            !name.trim()||
            !email.trim()||
            !password
        ) {
            return res.status(400).json({
                message:"Name, email and password are required"
            })
        }

        if(password.length<8){
            return res.status(400).json({
                message:"Password must ba at least 8 characters"
            })
        }

        const normalizedEmail=email.trim().toLowerCase()

        const existingUser=await User.findOne({
            email:normalizedEmail
        });

        if(existingUser){
            return res.status(400).json({
                message:"Email is already registered"
            })
        }

        const hashedPassword=await bcrypt.hash(password,10)

        const user=await User.create({
            name:name.trim(),
            email:normalizedEmail,
            password:hashedPassword
        })

        return res.status(201).json({
            message:"Registration successful!!",
            user:{
                id:user._id,
                name:user.name,
                email:user.email
            }
        })
    }catch (error){
        if(error.code===11000){
            return res.status(400).json({
                message:"Email is already registered"
            })
        }

        console.error("Registration error:", error.message)

        return res.status(500).json({
            message:"Server error during registration"
        })
    }
}

export const loginUser=async (req,res)=>{
    try{
        const{email,password}=req.body;

        if(
            typeof email !=="string" ||
            typeof password !== "string" ||
            !email.trim()||
            !password
        ) {
            return res.status(400).json({
                message:"Email and password are required"
            })
        }

        const normalizedEmail=email.trim().toLowerCase()

        const user=await User.findOne({
            email:normalizedEmail
        })

        if(!user){
            return res.status(401).json({
                message:"Invalid email or password"
            })
        }

        const isPasswordCorrect=await bcrypt.compare(
            password,
            user.password
        );

        if(!isPasswordCorrect){
            return res.status(401).json({
                message:"Invalid email or password"
            })
        }

        if(!process.env.JWT_SECRET){
            throw new Error("JWT_SECRET is missing from .env")
        }

        const token =jwt.sign(
            {userId: user._id.toString()},
            process.env.JWT_SECRET,
            { expiresIn:"1d"}
        );
        return res.status(200).json({
            message:"Login Successful!",
            token,
            user:{
                id:user._id,
                name:user.name,
                email:user.email
            }
        })
        }catch (error){
            console.error("Login error:",error.message)

            return res.status(500).json({
                message:"Server error during login"
            })
        }
    }

        export const getProfile=async(req,res)=>{
            try{
                const user= await User.findById(req.userId).select("-password");

                if(!user){
                    return res.status(404).json({
                        message:"User not found"
                    })
                }

                return res.status(200).json({
                    message:"Profile fetched successfully.",
                    user
                })
            }catch(error){
                console.error("Profile error:", error.message)

                return res.status(500).json({
                    message:"Server error while fetching profile"
                })
            }
        }
