import { useEffect, useReducer } from "react";
import {  useNavigate } from "react-router-dom";
import axios from "axios"
import "../App.css"

const initialState={
    projects:[],
    files:{},
    name:"",
    description:"",
    message:"",
    loading:true
};

function dashboardReducer(state,action){
    switch(action.type){
        case "SET_PROJECTS":
            return{
                ...state,
                projects:action.payload,
                loading:false,
            }
        case "SET_NAME":
                return{
                    ...state,
                    name:action.payload,
                };
        case "SET_DESCRIPTION":
            return {
                ...state,
                description:action.payload,
            }
        case "SET_MESSAGE":
            return{
                ...state,
                message:action.payload,
            }
        case "ADD_PROJECT":
            return{
                ...state,
                projects:[action.payload, ...state.projects],
                name:"",
                description:"",
                message:"Project created successfully!",
            }

        case "SET_LOADING":
            return{
                ...state,
                loading:action.payload,
            }

        case "SET_PROJECT_FILES":
            return{
                ...state,
                files:{
                    ...state.files,
                    [action.projectId]:action.payload
                }
            } 

        case "ADD_PROJECT_FILE":
            return{
                ...state,
                files:{
                    ...state.files,
                    [action.projectId]:[
                        action.payload,
                        ...(state.files[action.projectId]||[])
                    ]
                }
            }
            default:
                return state;
    }
}

function Dashboard(){
    const [state,dispatch]=useReducer(
        dashboardReducer,
        initialState
    )

    const navigate=useNavigate()
    useEffect(()=>{
        const token=localStorage.getItem("token")
        if(!token){
            navigate("/")
            return
        }

        async function loadProjects() {
            try{
                const response = await axios.get(
                    "http://localhost:5000/api/projects",
                    {
                        headers:{
                            Authorization: `Bearer ${token}`,
                        }
                    }
                );

                const projects=Array.isArray(response.data)
                ? response.data
                : response.data.projects || [];

                dispatch({
                    type:"SET_PROJECTS",
                    payload:projects,
                })

                for (const project of projects){
                    try{
                        const fileResponse=await axios.get(
                            `http://localhost:5000/api/files/${project._id}`,
                            {
                                headers:{
                                    Authorization: `Bearer ${token}`,
                                }
                            }  
                        )

                        dispatch ({
                            type:"SET_PROJECT_FILES",
                            projectId: project._id,
                            payload:fileResponse.data.files || [],
                        })
                    }catch (error){
                        console.error("Failed to load projects files:", error);
                        
                    }
                }
            }catch(error){
                dispatch({
                    type:"SET_LOADING",
                    payload:
                    error.response?.data?.message||
                    "Failed to load projects",
                })
            }
        }

        loadProjects();
    }, [navigate])
    async function handleCreateProjects(e) {
        e.preventDefault()

    const token = localStorage.getItem("token")

        if(!state.name.trim()){
            dispatch({
                type:"SET_MESSAGE",
                payload:"Please enter a projects name."
            })
            return
        }

        try{
            const response=await axios.post(
               "http://localhost:5000/api/projects",
               {
                name:state.name.trim(),
                description:state.description.trim(),
               },
               {
                headers:{
                    Authorization:`Bearer ${token}`,
                }
               }
            );

            const newProject=
                response.data.project||response.data;

            dispatch({
                type:"ADD_PROJECT",
                payload:newProject,
            })
        }catch(error){
            dispatch({
                type:"SET_MESSAGE",
                payload:
                error.response?.data?.message||
                "Failed to create project"
            })
        }
    }

  async function handleOpenFile(file, projectId, download=false) {
    const token = localStorage.getItem("token")

    const newTab = download ? null: window.open("about:blank", "_blank");

    try{
        const response = await axios.get(
        `http://localhost:5000/api/files/${projectId}/${file._id}`,
        {
            headers:{
                Authorization: `Bearer ${token}`,
            },

            params:download ? {download: "true"}:{},
            responseType: "blob",
        }
    );

    const fileUrl = URL.createObjectURL(response.data);

    if(download){
        const link = document.createElement("a")
        link.href= fileUrl;
        link.download = file.originalName;
        document.body.appendChild(link);
        link.click()    
        link.remove()

        setTimeout(()=> URIError.removeObjectURL(fileUrl), 1000);
    } else if(newTab){
        newTab.location.href=fileUrl;
    }else{
        URL.revokeObjectURL(fileUrl)
    }
    }catch(error){
        if (newTab) newTab.close();

        console.error("File open/download error:", error);

        dispatch({
            type:"SET_MESSAGE",
            payload:"Unable to open or download this file",
        })
        
    }
  }

    function handleLogout(){
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        navigate("/")
    }

    return(
        <div className="dashboard-page">
            <header className="dashboard-header">
                <h2>CollabSphere</h2>

                <button type="button"className="logout-button" onClick={handleLogout}>
                    Logout
                </button>
            </header>

            <main className="dashboard-content">
                <section className="welcome-section">
                <h1>Welcome to your Dashboard</h1>
                <p>Manage your developer projects in one place.</p>
                </section>
                <section className="project-form-card">
                    <h2>Create New Project</h2>

                    <form onSubmit={handleCreateProjects}>
                        <input
                        type="text"
                        placeholder="Project Name"
                        value={state.name}
                        onChange={(e)=>
                            dispatch({
                                type:"SET_NAME",
                                payload:e.target.value,
                            })
                        }
                        required
                        />

                        <label htmlFor="project-description">
                            Project Description
                            </label>
                        <textarea
                        id="project-description"
                        placeholder="Project description"
                        rows="4"
                        value={state.description}
                        onChange={(e)=>
                            dispatch({
                                type:"SET_DESCRIPTION",
                                payload:e.target.value,
                            })
                        }
                        />

                        <button type="submit" className="create-button">
                            Create Project
                        </button>
                    </form>

                    {state.message && 
                    (<p className="dashboard-message" role="status">
                        {state.message}
                    </p>
                )}
                </section>

                <section className="projects-section">
                    <h2>My Projects</h2>
                    {state.loading?(
                        <p>Loading Projects...</p>
                    ) : state.projects.length===0?(
                        <p>No project yet. Create your first project!</p>
                    ):(
                        <div className="project-grid">
                            {state.projects.map((project)=>(
                                <article
                                className="project-card"
                                key={project._id}
                                >
                                    <h3>{project.name}</h3>
                                    
                                    <p>
                                        {project.description||
                                        "No description provided"}
                                    </p>
                                    <form onSubmit={(e) => handleUploadFile(e,project._id)}
                                    className="upload-form"
                                    >
                                        <label htmlFor={`file-${project._id}`}>
                                            Upload a project file (PDF, etc.)
                                            </label>

                                            <input
                                            id={`file-${project._id}`}
                                            type="file"
                                            name="file"
                                            accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                                            required
                                            />

                                            <button type="submit" className="create-button">
                                                Upload File
                                            </button>
                                    </form>
                                    <div className="uploaded-files">
                                        <h4>Uploaded Files</h4>

                                        {(state.files[project._id] || []).length === 0 ?(
                                            <p>No Files uploaded yet.</p>
                                        ):(
                                            <ul>
                                                {(state.files[project._id] || []).map((file)=>(
                                                    <li key={file._id}>
                                                         📄 {file.originalName}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                    
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

export default Dashboard;