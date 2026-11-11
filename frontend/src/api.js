import axios from "axios"

const configuredApiBaseUrl=import.meta.env.VITE_API_BASE_URL?.trim()
if(import.meta.env.PROD&&!configuredApiBaseUrl){
    throw new Error("VITE_API_BASE_URL must be set for production builds")
}

const apiBaseUrl=(configuredApiBaseUrl||"http://localhost:5000")
    .replace(/\/+$/,"")

const api=axios.create({
    baseURL:apiBaseUrl,
})

export default api
