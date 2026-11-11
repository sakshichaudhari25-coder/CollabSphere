import { useEffect, useReducer, useState } from "react";
import {  useNavigate } from "react-router-dom";
import axios from "../api"
import "../App.css"

const initialState={
    projects:[],
    files:{},
    filesLoading:{},
    fileMessages:{},
    uploadProgress:{},
    deletingFileId:null,
    name:"",
    description:"",
    message:"",
    editingProject:null,
    editError:"",
    savingProject:false,
    deletingProjectId:null,
    managingProject:null,
    projectMembers:[],
    membersLoading:false,
    inviteEmail:"",
    memberAction:false,
    memberMessage:"",
    memberMessageType:"",
    notes:{},
    notesLoading:{},
    notesMessages:{},
    noteEditor:null,
    notePreview:false,
    savingNote:false,
    noteAiAction:"improve",
    noteAiInstructions:"",
    noteAiResult:"",
    noteAiLoading:false,
    noteAiError:"",
    noteAiNotice:"",
    projectAi:{},
    analytics:{},
    analyticsOpen:{},
    loadError:"",
    loading:true
};

function getStoredUserId(){
    const storedUser=localStorage.getItem("user")
    if(!storedUser) return null

    try{
        return JSON.parse(storedUser).id||null
    }catch{
        return null
    }
}

function renderInlineMarkdown(text,keyPrefix){
    const tokenPattern=/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g
    const tokens=text.split(tokenPattern).filter(Boolean)

    return tokens.map((token,index)=>{
        const key=`${keyPrefix}-${index}`
        const linkMatch=token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if(linkMatch){
            const href=linkMatch[2].trim()
            if(/^(https?:\/\/|mailto:|\/|#)/i.test(href)){
                return <a key={key} href={href} target="_blank" rel="noreferrer">{linkMatch[1]}</a>
            }
            return linkMatch[1]
        }
        if((token.startsWith("**")&&token.endsWith("**"))||
            (token.startsWith("__")&&token.endsWith("__"))){
            return <strong key={key}>{token.slice(2,-2)}</strong>
        }
        if((token.startsWith("*")&&token.endsWith("*"))||
            (token.startsWith("_")&&token.endsWith("_"))){
            return <em key={key}>{token.slice(1,-1)}</em>
        }
        if(token.startsWith("`")&&token.endsWith("`")){
            return <code key={key}>{token.slice(1,-1)}</code>
        }
        return token
    })
}

function MarkdownPreview({content}){
    const lines=content.split("\n")
    const blocks=[]
    let paragraph=[]
    let listItems=[]
    let listType=null
    let codeLines=[]
    let inCodeBlock=false
    let blockKey=0

    const flushParagraph=()=>{
        if(paragraph.length){
            blocks.push(
                <p key={`paragraph-${blockKey++}`}>
                    {paragraph.map((line,index)=>(
                        <span key={index}>
                            {index>0&&" "}
                            {renderInlineMarkdown(line,`p-${blockKey}-${index}`)}
                        </span>
                    ))}
                </p>
            )
            paragraph=[]
        }
    }
    const flushList=()=>{
        if(!listItems.length) return
        const ListTag=listType==="ordered"?"ol":"ul"
        blocks.push(
            <ListTag key={`list-${blockKey++}`}>
                {listItems.map((item,index)=>(
                    <li key={index}>{renderInlineMarkdown(item,`list-${blockKey}-${index}`)}</li>
                ))}
            </ListTag>
        )
        listItems=[]
        listType=null
    }

    lines.forEach((line,index)=>{
        if(line.trim().startsWith("```")){
            flushParagraph()
            flushList()
            if(inCodeBlock){
                blocks.push(
                    <pre key={`code-${blockKey++}`}><code>{codeLines.join("\n")}</code></pre>
                )
                codeLines=[]
                inCodeBlock=false
            }else{
                inCodeBlock=true
            }
            return
        }
        if(inCodeBlock){
            codeLines.push(line)
            return
        }
        if(!line.trim()){
            flushParagraph()
            flushList()
            return
        }

        const heading=line.match(/^(#{1,6})\s+(.+)$/)
        if(heading){
            flushParagraph()
            flushList()
            const level=heading[1].length
            const HeadingTag=`h${level}`
            blocks.push(
                <HeadingTag key={`heading-${blockKey++}`}>
                    {renderInlineMarkdown(heading[2],`heading-${index}`)}
                </HeadingTag>
            )
            return
        }

        const unordered=line.match(/^\s*[-*+]\s+(.+)$/)
        const ordered=line.match(/^\s*\d+[.)]\s+(.+)$/)
        if(unordered||ordered){
            flushParagraph()
            const nextType=ordered?"ordered":"unordered"
            if(listType&&listType!==nextType) flushList()
            listType=nextType
            listItems.push((unordered||ordered)[1])
            return
        }

        flushList()
        paragraph.push(line.trim())
    })

    flushParagraph()
    flushList()
    if(inCodeBlock){
        blocks.push(<pre key={`code-${blockKey++}`}><code>{codeLines.join("\n")}</code></pre>)
    }

    return <div className="markdown-preview">{blocks}</div>
}

const activityLabels={
    project_created:"Project created",
    project_updated:"Project updated",
    project_deleted:"Project deleted",
    member_invited:"Member invited",
    member_removed:"Member removed",
    note_created:"Note created",
    note_updated:"Note edited",
    note_deleted:"Note deleted",
    file_uploaded:"File uploaded",
    file_deleted:"File deleted",
    ai_note_assistant:"AI note assistant",
    ai_project_assistant:"AI project assistant",
}

const chartColors=[
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
    "var(--chart-7)",
    "var(--chart-8)",
]

const navigationItems=[
    {id:"dashboard",label:"Dashboard",icon:"grid"},
    {id:"projects",label:"Projects",icon:"layers"},
    {id:"team",label:"Team Members",icon:"users"},
    {id:"notes",label:"Notes",icon:"note"},
    {id:"files",label:"Files",icon:"file"},
    {id:"ai",label:"AI Assistant",icon:"sparkles"},
    {id:"analytics",label:"Analytics",icon:"chart"},
    {id:"settings",label:"Settings",icon:"settings"},
]

function NavigationIcon({name}){
    const paths={
        grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
        layers:<><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>,
        users:<><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
        note:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
        file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>,
        sparkles:<><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14ZM5 2l.8 2.2L8 5l-2.2.8L5 8l-.8-2.2L2 5l2.2-.8L5 2Z"/></>,
        chart:<><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/></>,
        settings:<><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/></>,
        sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
        moon:<><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></>,
        menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
        collapse:<><path d="m15 18-6-6 6-6"/><path d="M20 4v16"/></>,
        logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></>,
        plus:<><path d="M12 5v14M5 12h14"/></>,
    }
    return(
        <svg
            aria-hidden="true"
            className="sidebar-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {paths[name]||paths.grid}
        </svg>
    )
}

function ContributionChart({members}){
    const max=Math.max(1,...members.map((member)=>member.contributions))
    if(!members.length)return <p className="analytics-empty">No member data available.</p>
    return(
        <div className="contribution-chart" role="img" aria-label="Bar chart of member contributions">
            {members.map((member,index)=>(
                <div className="contribution-row" key={member.userId}>
                    <span title={member.email}>{member.name}</span>
                    <div className="contribution-track">
                        <div
                            className="contribution-bar"
                            style={{
                                width:`${member.contributions?Math.max(4,member.contributions/max*100):0}%`,
                                backgroundColor:chartColors[index%chartColors.length],
                            }}
                        />
                    </div>
                    <strong>{member.contributions}</strong>
                </div>
            ))}
        </div>
    )
}

function ActivityPieChart({distribution}){
    const total=distribution.reduce((sum,item)=>sum+item.count,0)
    if(!total)return <p className="analytics-empty">No activities to chart yet.</p>
    const slices=distribution.map((item,index)=>{
        const preceding=distribution
            .slice(0,index)
            .reduce((sum,entry)=>sum+entry.count,0)
        const start=preceding/total*100
        const end=(preceding+item.count)/total*100
        return `${chartColors[index%chartColors.length]} ${start}% ${end}%`
    })
    return(
        <div className="activity-pie-layout">
            <div
                className="activity-pie"
                role="img"
                aria-label={`Activity distribution with ${total} activities`}
                style={{background:`conic-gradient(${slices.join(", ")})`}}
            />
            <ul className="activity-legend">
                {distribution.map((item,index)=>(
                    <li key={item.type}>
                        <span style={{backgroundColor:chartColors[index%chartColors.length]}}/>
                        <span>{activityLabels[item.type]||item.type}</span>
                        <strong>{item.count}</strong>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function ActivityLineChart({activityOverTime}){
    if(!activityOverTime.some((item)=>item.count)){
        return <p className="analytics-empty">No activity recorded in the last 14 days.</p>
    }
    const max=Math.max(1,...activityOverTime.map((item)=>item.count))
    const points=activityOverTime.map((item,index)=>{
        const x=10+index*280/Math.max(1,activityOverTime.length-1)
        const y=90-item.count/max*72
        return `${x},${y}`
    }).join(" ")
    return(
        <div className="activity-line-wrap">
            <svg
                className="activity-line-chart"
                viewBox="0 0 300 105"
                role="img"
                aria-label="Line chart of daily project activities for the last 14 days"
            >
                <line x1="10" y1="90" x2="290" y2="90" className="chart-axis"/>
                <polyline points={points} className="chart-line"/>
                {activityOverTime.map((item,index)=>{
                    const x=10+index*280/Math.max(1,activityOverTime.length-1)
                    const y=90-item.count/max*72
                    return <circle key={item.date} cx={x} cy={y} r="2.8" className="chart-point"/>
                })}
            </svg>
            <div className="activity-line-labels">
                <span>{activityOverTime[0]?.date}</span>
                <span>{activityOverTime.at(-1)?.date}</span>
            </div>
        </div>
    )
}

function dashboardReducer(state,action){
    switch(action.type){
        case "SET_PROJECTS":
            return{
                ...state,
                projects:action.payload,
                loadError:"",
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
        case "SET_EDITING_PROJECT":
            return{
                ...state,
                editingProject:action.payload,
                editError:"",
            }
        case "SET_EDIT_ERROR":
            return{
                ...state,
                editError:action.payload,
            }
        case "SET_EDIT_NAME":
            return{
                ...state,
                editingProject:{
                    ...state.editingProject,
                    name:action.payload,
                },
            }
        case "SET_ANALYTICS_OPEN":
            return{
                ...state,
                analyticsOpen:{
                    ...state.analyticsOpen,
                    [action.projectId]:action.payload,
                },
            }
        case "SET_ANALYTICS_LOADING":
            return{
                ...state,
                analytics:{
                    ...state.analytics,
                    [action.projectId]:{
                        ...state.analytics[action.projectId],
                        loading:true,
                        error:"",
                        filter:action.filter??state.analytics[action.projectId]?.filter??"all",
                    },
                },
            }
        case "SET_ANALYTICS_DATA":
            return{
                ...state,
                analytics:{
                    ...state.analytics,
                    [action.projectId]:{
                        ...state.analytics[action.projectId],
                        ...action.payload,
                        loading:false,
                        error:"",
                        filter:action.filter??state.analytics[action.projectId]?.filter??"all",
                    },
                },
            }
        case "SET_ANALYTICS_ACTIVITIES":
            return{
                ...state,
                analytics:{
                    ...state.analytics,
                    [action.projectId]:{
                        ...state.analytics[action.projectId],
                        activities:action.payload,
                        loading:false,
                        error:"",
                        filter:action.filter,
                    },
                },
            }
        case "SET_ANALYTICS_ERROR":
            return{
                ...state,
                analytics:{
                    ...state.analytics,
                    [action.projectId]:{
                        ...state.analytics[action.projectId],
                        loading:false,
                        error:action.payload,
                    },
                },
            }
        case "SET_ANALYTICS_FILTER":
            return{
                ...state,
                analytics:{
                    ...state.analytics,
                    [action.projectId]:{
                        ...state.analytics[action.projectId],
                        filter:action.payload,
                    },
                },
            }
        case "SET_EDIT_DESCRIPTION":
            return{
                ...state,
                editingProject:{
                    ...state.editingProject,
                    description:action.payload,
                },
            }
        case "SET_SAVING_PROJECT":
            return{
                ...state,
                savingProject:action.payload,
            }
        case "SET_DELETING_PROJECT":
            return{
                ...state,
                deletingProjectId:action.payload,
            }
        case "UPDATE_PROJECT":
            return{
                ...state,
                projects:state.projects.map((project)=>
                    project._id===action.payload._id
                        ? action.payload
                        : project
                ),
                analytics:Object.fromEntries(
                    Object.entries(state.analytics).filter(
                        ([projectId])=>projectId!==action.projectId
                    )
                ),
                analyticsOpen:Object.fromEntries(
                    Object.entries(state.analyticsOpen).filter(
                        ([projectId])=>projectId!==action.projectId
                    )
                ),
                editingProject:null,
                savingProject:false,
                message:"Project updated successfully!",
            }
        case "UPDATE_PROJECT_MEMBERS":
            return{
                ...state,
                projects:state.projects.map((project)=>
                    project._id===action.projectId
                        ?{...project,members:action.members}
                        :project
                ),
            }
        case "REMOVE_PROJECT":
            return{
                ...state,
                projects:state.projects.filter(
                    (project)=>project._id!==action.projectId
                ),
                files:Object.fromEntries(
                    Object.entries(state.files).filter(
                        ([projectId])=>projectId!==action.projectId
                    )
                ),
                deletingProjectId:null,
                message:"Project deleted successfully!",
            }
        case "SET_MANAGING_PROJECT":
            return{
                ...state,
                managingProject:action.payload,
                projectMembers:[],
                inviteEmail:"",
                memberMessage:"",
                memberMessageType:"",
                membersLoading:Boolean(action.payload),
            }
        case "SET_PROJECT_MEMBERS":
            return{
                ...state,
                projectMembers:action.payload,
                membersLoading:false,
            }
        case "SET_MEMBERS_LOADING":
            return{
                ...state,
                membersLoading:action.payload,
            }
        case "SET_INVITE_EMAIL":
            return{
                ...state,
                inviteEmail:action.payload,
            }
        case "SET_MEMBER_ACTION":
            return{
                ...state,
                memberAction:action.payload,
            }
        case "SET_MEMBER_MESSAGE":
            return{
                ...state,
                memberMessage:action.payload.message,
                memberMessageType:action.payload.type,
            }
        case "SET_PROJECT_NOTES":
            return{
                ...state,
                notes:{
                    ...state.notes,
                    [action.projectId]:action.payload,
                },
                notesLoading:{
                    ...state.notesLoading,
                    [action.projectId]:false,
                },
            }
        case "SET_NOTES_LOADING":
            return{
                ...state,
                notesLoading:{
                    ...state.notesLoading,
                    [action.projectId]:action.payload,
                },
            }
        case "SET_NOTES_MESSAGE":
            return{
                ...state,
                notesMessages:{
                    ...state.notesMessages,
                    [action.projectId]:action.payload,
                },
            }
        case "SET_NOTE_EDITOR":
            return{
                ...state,
                noteEditor:action.payload,
                notePreview:false,
                noteAiAction:"improve",
                noteAiInstructions:"",
                noteAiResult:"",
                noteAiError:"",
                noteAiNotice:"",
            }
        case "SET_NOTE_TITLE":
            return{
                ...state,
                noteEditor:{
                    ...state.noteEditor,
                    title:action.payload,
                },
            }
        case "SET_NOTE_CONTENT":
            return{
                ...state,
                noteEditor:{
                    ...state.noteEditor,
                    content:action.payload,
                },
            }
        case "SET_NOTE_PREVIEW":
            return{
                ...state,
                notePreview:action.payload,
            }
        case "SET_SAVING_NOTE":
            return{
                ...state,
                savingNote:action.payload,
            }
        case "SET_NOTE_AI_ACTION":
            return{
                ...state,
                noteAiAction:action.payload,
            }
        case "SET_NOTE_AI_INSTRUCTIONS":
            return{
                ...state,
                noteAiInstructions:action.payload,
            }
        case "SET_NOTE_AI_LOADING":
            return{
                ...state,
                noteAiLoading:action.payload,
                noteAiResult:"",
                noteAiError:"",
                noteAiNotice:"",
            }
        case "SET_NOTE_AI_RESULT":
            return{
                ...state,
                noteAiLoading:false,
                noteAiResult:action.payload,
                noteAiError:"",
                noteAiNotice:"AI draft is ready. Review it before using it in your note.",
            }
        case "SET_NOTE_AI_ERROR":
            return{
                ...state,
                noteAiLoading:false,
                noteAiError:action.payload,
                noteAiNotice:"",
            }
        case "SET_NOTE_AI_NOTICE":
            return{
                ...state,
                noteAiNotice:action.payload,
            }
        case "SET_PROJECT_AI_QUESTION":
            return{
                ...state,
                projectAi:{
                    ...state.projectAi,
                    [action.projectId]:{
                        ...state.projectAi[action.projectId],
                        question:action.payload,
                    },
                },
            }
        case "SET_PROJECT_AI_LOADING":
            return{
                ...state,
                projectAi:{
                    ...state.projectAi,
                    [action.projectId]:{
                        ...state.projectAi[action.projectId],
                        loading:true,
                        response:"",
                        error:"",
                        notice:"",
                    },
                },
            }
        case "SET_PROJECT_AI_RESPONSE":
            return{
                ...state,
                projectAi:{
                    ...state.projectAi,
                    [action.projectId]:{
                        ...state.projectAi[action.projectId],
                        loading:false,
                        response:action.payload,
                        error:"",
                        notice:"AI response ready.",
                    },
                },
            }
        case "SET_PROJECT_AI_ERROR":
            return{
                ...state,
                projectAi:{
                    ...state.projectAi,
                    [action.projectId]:{
                        ...state.projectAi[action.projectId],
                        loading:false,
                        error:action.payload,
                        notice:"",
                    },
                },
            }
        case "SET_PROJECT_AI_NOTICE":
            return{
                ...state,
                projectAi:{
                    ...state.projectAi,
                    [action.projectId]:{
                        ...state.projectAi[action.projectId],
                        notice:action.payload,
                    },
                },
            }
        case "UPSERT_PROJECT_NOTE":
            return{
                ...state,
                notes:{
                    ...state.notes,
                    [action.projectId]:[
                        action.note,
                        ...(state.notes[action.projectId]||[]).filter(
                            (note)=>note._id!==action.note._id
                        ),
                    ],
                },
                noteEditor:null,
                notePreview:false,
                savingNote:false,
                notesMessages:{
                    ...state.notesMessages,
                    [action.projectId]:action.message,
                },
            }
        case "REMOVE_PROJECT_NOTE":
            return{
                ...state,
                notes:{
                    ...state.notes,
                    [action.projectId]:(state.notes[action.projectId]||[]).filter(
                        (note)=>note._id!==action.noteId
                    ),
                },
                notesMessages:{
                    ...state.notesMessages,
                    [action.projectId]:action.message,
                },
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
                loadError:action.payload,
                loading:false,
            }

        case "SET_PROJECT_FILES":
            return{
                ...state,
                files:{
                    ...state.files,
                    [action.projectId]:action.payload
                },
                filesLoading:{
                    ...state.filesLoading,
                    [action.projectId]:false,
                }
            }
        case "SET_FILES_LOADING":
            return{
                ...state,
                filesLoading:{
                    ...state.filesLoading,
                    [action.projectId]:action.payload,
                }
            }
        case "SET_FILE_MESSAGE":
            return{
                ...state,
                fileMessages:{
                    ...state.fileMessages,
                    [action.projectId]:action.payload,
                }
            }
        case "SET_UPLOAD_PROGRESS":
            return{
                ...state,
                uploadProgress:{
                    ...state.uploadProgress,
                    [action.projectId]:action.payload,
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
                    ],
                },
                uploadProgress:{
                    ...state.uploadProgress,
                    [action.projectId]:null,
                },
                fileMessages:{
                    ...state.fileMessages,
                    [action.projectId]:"File uploaded successfully!",
                }
            }
        case "SET_DELETING_FILE":
            return{
                ...state,
                deletingFileId:action.payload,
            }
        case "REMOVE_PROJECT_FILE":
            return{
                ...state,
                files:{
                    ...state.files,
                    [action.projectId]:(state.files[action.projectId]||[])
                        .filter((file)=>file._id!==action.fileId),
                },
                deletingFileId:null,
                fileMessages:{
                    ...state.fileMessages,
                    [action.projectId]:"File deleted successfully!",
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

    const [activeView,setActiveView]=useState("dashboard")
    const [sidebarCollapsed,setSidebarCollapsed]=useState(false)
    const [mobileMenuOpen,setMobileMenuOpen]=useState(false)
    const [projectSearch,setProjectSearch]=useState("")
    const [theme,setTheme]=useState(()=>localStorage.getItem("collabsphere-theme")||"light")
    const currentUserId=getStoredUserId()
    const currentUser=(()=>{
        try{
            return JSON.parse(localStorage.getItem("user")||"{}")
        }catch{
            return {}
        }
    })()
    const navigate=useNavigate()

    useEffect(()=>{
        document.documentElement.dataset.theme=theme
        localStorage.setItem("collabsphere-theme",theme)
    },[theme])

    useEffect(()=>{
        if(!mobileMenuOpen)return undefined
        const closeOnEscape=(event)=>{
            if(event.key==="Escape"){
                setMobileMenuOpen(false)
            }
        }
        document.addEventListener("keydown",closeOnEscape)
        return ()=>document.removeEventListener("keydown",closeOnEscape)
    },[mobileMenuOpen])

    useEffect(()=>{
        const token=localStorage.getItem("token")
        if(!token){
            navigate("/")
            return
        }

        async function loadProjects() {
            try{
                const response = await axios.get(
                    "/api/projects",
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
                    dispatch({
                        type:"SET_FILES_LOADING",
                        projectId:project._id,
                        payload:true,
                    })
                    try{
                        const fileResponse=await axios.get(
                            `/api/files/${project._id}`,
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
                        dispatch({
                            type:"SET_FILES_LOADING",
                            projectId:project._id,
                            payload:false,
                        })
                        dispatch({
                            type:"SET_FILE_MESSAGE",
                            projectId:project._id,
                            payload:error.response?.data?.message||
                                "Failed to load project files",
                        })
                    }
                    dispatch({
                        type:"SET_NOTES_LOADING",
                        projectId:project._id,
                        payload:true,
                    })
                    try{
                        const notesResponse=await axios.get(
                            `/api/projects/${project._id}/notes`,
                            {
                                headers:{
                                    Authorization:`Bearer ${token}`
                                }
                            }
                        )
                        dispatch({
                            type:"SET_PROJECT_NOTES",
                            projectId:project._id,
                            payload:notesResponse.data.notes||[],
                        })
                    }catch(error){
                        dispatch({
                            type:"SET_NOTES_LOADING",
                            projectId:project._id,
                            payload:false,
                        })
                        dispatch({
                            type:"SET_NOTES_MESSAGE",
                            projectId:project._id,
                            payload:error.response?.data?.message||
                                "Failed to load project notes",
                        })
                    }
                    loadProjectAnalytics(project._id)
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

    const pageDetails={
        dashboard:{
            title:`Welcome back${currentUser.name?`, ${currentUser.name.split(" ")[0]}`:""}`,
            description:"Here's what's happening across your collaboration workspace.",
        },
        projects:{title:"Projects",description:"Create, organize, and manage your team projects."},
        team:{title:"Team Members",description:"Manage project access and keep your collaborators connected."},
        notes:{title:"Project Notes",description:"Browse and create shared Markdown documentation."},
        files:{title:"Project Files",description:"Upload, preview, and manage project documents and code."},
        ai:{title:"AI Assistant",description:"Get help understanding and improving your project work."},
        analytics:{title:"Analytics",description:"Understand project activity and team contributions."},
        settings:{title:"Settings",description:"Manage your appearance and account session."},
    }

    const memberIds=new Set()
    state.projects.forEach((project)=>{
        memberIds.add(String(project.owner?._id||project.owner))
        ;(project.members||[]).forEach((member)=>{
            memberIds.add(String(member?._id||member))
        })
    })
    const totalNotes=Object.values(state.notes).reduce(
        (total,notes)=>total+notes.length,
        0
    )
    const totalFiles=Object.values(state.files).reduce(
        (total,files)=>total+files.length,
        0
    )
    const recentActivities=Object.values(state.analytics)
        .flatMap((analytics)=>analytics.activities||[])
        .filter((activity,index,all)=>
            all.findIndex((entry)=>entry._id===activity._id)===index
        )
        .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
        .slice(0,6)
    const resourcesLoading=Object.values(state.filesLoading).some(Boolean)||
        Object.values(state.notesLoading).some(Boolean)
    const analyticsLoading=Object.values(state.analytics).some(
        (analytics)=>analytics.loading
    )
    const page=pageDetails[activeView]

    function handleNavigation(view){
        setActiveView(view)
        setMobileMenuOpen(false)
        if(view==="analytics"){
            state.projects.forEach((project)=>{
                dispatch({
                    type:"SET_ANALYTICS_OPEN",
                    projectId:project._id,
                    payload:true,
                })
                loadProjectAnalytics(project._id)
            })
        }
    }

    function handleQuickAction(action){
        if(action==="project"){
            handleNavigation("projects")
            window.setTimeout(()=>{
                document.getElementById("create-project-form")?.scrollIntoView({
                    behavior:"smooth",
                    block:"center",
                })
                document.getElementById("new-project-name")?.focus()
            },0)
            return
        }
        if(action==="note"){
            if(state.projects.length){
                openNoteEditor(state.projects[0])
            }else{
                dispatch({
                    type:"SET_MESSAGE",
                    payload:"Create a project before adding a note.",
                })
                handleNavigation("projects")
            }
            return
        }
        handleNavigation("files")
    }

    const visibleProjects=state.projects.filter((project)=>
        `${project.name} ${project.description||""}`
            .toLowerCase()
            .includes(projectSearch.trim().toLowerCase())
    )

    async function loadProjectAnalytics(projectId,filter="all"){
        dispatch({
            type:"SET_ANALYTICS_LOADING",
            projectId,
            filter,
        })
        try{
            const response=await axios.get(
                `/api/projects/${projectId}/analytics`,
                {
                    params:{type:filter},
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )
            dispatch({
                type:"SET_ANALYTICS_DATA",
                projectId,
                filter,
                payload:response.data,
            })
        }catch(error){
            dispatch({
                type:"SET_ANALYTICS_ERROR",
                projectId,
                payload:error.response?.data?.message||
                    "Failed to load project analytics",
            })
        }
    }

    async function loadProjectActivities(projectId,filter){
        dispatch({
            type:"SET_ANALYTICS_LOADING",
            projectId,
            filter,
        })
        try{
            const response=await axios.get(
                `/api/projects/${projectId}/activities`,
                {
                    params:{type:filter},
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )
            dispatch({
                type:"SET_ANALYTICS_ACTIVITIES",
                projectId,
                filter,
                payload:response.data.activities||[],
            })
        }catch(error){
            dispatch({
                type:"SET_ANALYTICS_ERROR",
                projectId,
                payload:error.response?.data?.message||
                    "Failed to load project activity",
            })
        }
    }

    function refreshProjectAnalytics(projectId){
        if(state.analyticsOpen[projectId]){
            loadProjectAnalytics(
                projectId,
                state.analytics[projectId]?.filter||"all"
            )
        }
    }

    function handleToggleAnalytics(project){
        const isOpen=Boolean(state.analyticsOpen[project._id])
        dispatch({
            type:"SET_ANALYTICS_OPEN",
            projectId:project._id,
            payload:!isOpen,
        })
        if(!isOpen){
            loadProjectAnalytics(project._id)
        }
    }

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
               "/api/projects",
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
            Object.keys(state.analyticsOpen).forEach(refreshProjectAnalytics)
        }catch(error){
            dispatch({
                type:"SET_MESSAGE",
                payload:
                error.response?.data?.message||
                "Failed to create project"
            })
        }
    }

    async function handleUpdateProject(e) {
        e.preventDefault()

        const project=state.editingProject
        if(!project?.name.trim()){
            dispatch({
                type:"SET_MESSAGE",
                payload:"Please enter a project name."
            })
            return
        }

        dispatch({type:"SET_SAVING_PROJECT",payload:true})
        dispatch({type:"SET_EDIT_ERROR",payload:""})
        try{
            const response=await axios.put(
                `/api/projects/${project._id}`,
                {
                    name:project.name.trim(),
                    description:(project.description||"").trim(),
                },
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )

            dispatch({
                type:"UPDATE_PROJECT",
                payload:response.data.project,
            })
            refreshProjectAnalytics(project._id)
        }catch(error){
            dispatch({type:"SET_SAVING_PROJECT",payload:false})
            dispatch({
                type:"SET_MESSAGE",
                payload:error.response?.data?.message||
                    "Failed to update project"
            })
            dispatch({
                type:"SET_EDIT_ERROR",
                payload:error.response?.data?.message||
                    "Failed to update project"
            })
        }
    }

    async function handleDeleteProject(project) {
        if(!window.confirm(`Delete "${project.name}"? This action cannot be undone.`)){
            return
        }

        dispatch({
            type:"SET_DELETING_PROJECT",
            payload:project._id,
        })

        try{
            await axios.delete(
                `/api/projects/${project._id}`,
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )

            dispatch({
                type:"REMOVE_PROJECT",
                projectId:project._id,
            })
        }catch(error){
            dispatch({type:"SET_DELETING_PROJECT",payload:null})
            dispatch({
                type:"SET_MESSAGE",
                payload:error.response?.data?.message||
                    "Failed to delete project"
            })
        }
    }

    async function handleManageMembers(project) {
        dispatch({
            type:"SET_MANAGING_PROJECT",
            payload:project,
        })

        try{
            const response=await axios.get(
                `/api/projects/${project._id}/members`,
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )

            dispatch({
                type:"SET_PROJECT_MEMBERS",
                payload:response.data.members||[],
            })
        }catch(error){
            dispatch({type:"SET_MEMBERS_LOADING",payload:false})
            dispatch({
                type:"SET_MEMBER_MESSAGE",
                payload:{
                    type:"error",
                    message:error.response?.data?.message||
                        "Failed to load project members"
                }
            })
        }
    }

    async function handleInviteMember(e) {
        e.preventDefault()
        if(!state.inviteEmail.trim()){
            dispatch({
                type:"SET_MEMBER_MESSAGE",
                payload:{
                    type:"error",
                    message:"Enter an email address to invite"
                }
            })
            return
        }

        dispatch({type:"SET_MEMBER_ACTION",payload:true})
        dispatch({
            type:"SET_MEMBER_MESSAGE",
            payload:{type:"",message:""}
        })
        try{
            const response=await axios.post(
                `/api/projects/${state.managingProject._id}/members`,
                {email:state.inviteEmail.trim()},
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )

            dispatch({
                type:"SET_PROJECT_MEMBERS",
                payload:response.data.members||[],
            })
            dispatch({
                type:"UPDATE_PROJECT_MEMBERS",
                projectId:state.managingProject._id,
                members:response.data.members||[],
            })
            refreshProjectAnalytics(state.managingProject._id)
            dispatch({type:"SET_INVITE_EMAIL",payload:""})
            dispatch({
                type:"SET_MEMBER_MESSAGE",
                payload:{
                    type:"success",
                    message:response.data.message||"Member invited successfully!"
                }
            })
        }catch(error){
            dispatch({
                type:"SET_MEMBER_MESSAGE",
                payload:{
                    type:"error",
                    message:error.response?.data?.message||
                        "Failed to invite member"
                }
            })
        }finally{
            dispatch({type:"SET_MEMBER_ACTION",payload:false})
        }
    }

    async function handleRemoveMember(member) {
        if(!window.confirm(`Remove ${member.name} from this project?`)){
            return
        }

        dispatch({type:"SET_MEMBER_ACTION",payload:true})
        dispatch({
            type:"SET_MEMBER_MESSAGE",
            payload:{type:"",message:""}
        })
        try{
            const response=await axios.delete(
                `/api/projects/${state.managingProject._id}/members/${member._id}`,
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )

            dispatch({
                type:"SET_PROJECT_MEMBERS",
                payload:response.data.members||[],
            })
            dispatch({
                type:"UPDATE_PROJECT_MEMBERS",
                projectId:state.managingProject._id,
                members:response.data.members||[],
            })
            dispatch({
                type:"SET_MEMBER_MESSAGE",
                payload:{
                    type:"success",
                    message:response.data.message||"Member removed successfully!"
                }
            })
            refreshProjectAnalytics(state.managingProject._id)
        }catch(error){
            dispatch({
                type:"SET_MEMBER_MESSAGE",
                payload:{
                    type:"error",
                    message:error.response?.data?.message||
                        "Failed to remove member"
                }
            })
        }finally{
            dispatch({type:"SET_MEMBER_ACTION",payload:false})
        }
    }

    function openNoteEditor(project,note=null){
        dispatch({
            type:"SET_NOTES_MESSAGE",
            projectId:project._id,
            payload:"",
        })
        dispatch({
            type:"SET_NOTE_EDITOR",
            payload:{
                projectId:project._id,
                _id:note?._id||null,
                title:note?.title||"",
                content:note?.content||"",
            },
        })
    }

    async function handleSaveNote(e){
        e.preventDefault()
        const editor=state.noteEditor
        if(!editor)return
        if(!editor.title.trim()||!editor.content.trim()){
            dispatch({
                type:"SET_NOTES_MESSAGE",
                projectId:editor.projectId,
                payload:"A note title and Markdown content are required.",
            })
            return
        }

        dispatch({type:"SET_SAVING_NOTE",payload:true})
        dispatch({
            type:"SET_NOTES_MESSAGE",
            projectId:editor.projectId,
            payload:"",
        })
        try{
            const config={
                headers:{
                    Authorization:`Bearer ${localStorage.getItem("token")}`
                }
            }
            const url=`/api/projects/${editor.projectId}/notes`
            const response=editor._id
                ? await axios.put(`${url}/${editor._id}`,{
                    title:editor.title.trim(),
                    content:editor.content,
                },config)
                : await axios.post(url,{
                    title:editor.title.trim(),
                    content:editor.content,
                },config)

            dispatch({
                type:"UPSERT_PROJECT_NOTE",
                projectId:editor.projectId,
                note:response.data.note,
                message:response.data.message||"Note saved successfully!",
            })
            refreshProjectAnalytics(editor.projectId)
        }catch(error){
            dispatch({type:"SET_SAVING_NOTE",payload:false})
            dispatch({
                type:"SET_NOTES_MESSAGE",
                projectId:editor.projectId,
                payload:error.response?.data?.message||
                    "Failed to save note",
            })
        }
    }

    async function handleNoteAI(){
        const editor=state.noteEditor
        if(!editor)return
        if(state.noteAiAction==="generate"&&
            !editor.title.trim()&&!state.noteAiInstructions.trim()){
            dispatch({
                type:"SET_NOTE_AI_ERROR",
                payload:"Add a note title or instructions before generating content.",
            })
            return
        }
        if(state.noteAiAction!=="generate"&&!editor.content.trim()){
            dispatch({
                type:"SET_NOTE_AI_ERROR",
                payload:"Write some note content before asking AI to process it.",
            })
            return
        }

        dispatch({type:"SET_NOTE_AI_LOADING",payload:true})
        try{
            const response=await axios.post(
                `/api/ai/projects/${editor.projectId}/note-assistant`,
                {
                    action:state.noteAiAction,
                    title:editor.title,
                    content:editor.content,
                    instructions:state.noteAiInstructions,
                },
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )
            if(typeof response.data.content!=="string"||!response.data.content.trim()){
                throw new Error("The AI returned an empty response.")
            }
            dispatch({
                type:"SET_NOTE_AI_RESULT",
                payload:response.data.content,
            })
            refreshProjectAnalytics(editor.projectId)
        }catch(error){
            dispatch({
                type:"SET_NOTE_AI_ERROR",
                payload:error.response?.data?.message||
                    error.message||
                    "AI could not process this note",
            })
        }
    }

    async function handleCopyText(text,onCopied,onError){
        try{
            await navigator.clipboard.writeText(text)
            onCopied()
        }catch{
            onError("Could not copy to clipboard. Check browser clipboard permissions.")
        }
    }

    async function handleProjectAI(project,action){
        const projectState=state.projectAi[project._id]||{}
        if(action==="question"&&!projectState.question?.trim()){
            dispatch({
                type:"SET_PROJECT_AI_ERROR",
                projectId:project._id,
                payload:"Enter a question about this project.",
            })
            return
        }

        dispatch({
            type:"SET_PROJECT_AI_LOADING",
            projectId:project._id,
        })
        try{
            const response=await axios.post(
                `/api/ai/projects/${project._id}/assistant`,
                {
                    action,
                    question:projectState.question||"",
                },
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )
            if(typeof response.data.response!=="string"||!response.data.response.trim()){
                throw new Error("The AI returned an empty response.")
            }
            dispatch({
                type:"SET_PROJECT_AI_RESPONSE",
                projectId:project._id,
                payload:response.data.response,
            })
            refreshProjectAnalytics(project._id)
        }catch(error){
            dispatch({
                type:"SET_PROJECT_AI_ERROR",
                projectId:project._id,
                payload:error.response?.data?.message||
                    error.message||
                    "AI could not respond to this request",
            })
        }
    }

    async function handleDeleteNote(project,note){
        if(!window.confirm(`Delete "${note.title}"? This action cannot be undone.`)){
            return
        }

        try{
            await axios.delete(
                `/api/projects/${project._id}/notes/${note._id}`,
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )
            dispatch({
                type:"REMOVE_PROJECT_NOTE",
                projectId:project._id,
                noteId:note._id,
                message:"Note deleted successfully!",
            })
            refreshProjectAnalytics(project._id)
        }catch(error){
            dispatch({
                type:"SET_NOTES_MESSAGE",
                projectId:project._id,
                payload:error.response?.data?.message||
                    "Failed to delete note",
            })
        }
    }

    async function handleUploadFile(e,projectId) {
        e.preventDefault()
        const form=e.currentTarget
        const selectedFile=form.elements.file.files[0]
        if(!selectedFile){
            dispatch({
                type:"SET_FILE_MESSAGE",
                projectId,
                payload:"Select a file to upload.",
            })
            return
        }

        const formData=new FormData()
        formData.append("file",selectedFile)
        dispatch({
            type:"SET_FILE_MESSAGE",
            projectId,
            payload:"",
        })
        dispatch({
            type:"SET_UPLOAD_PROGRESS",
            projectId,
            payload:0,
        })

        try{
            const response=await axios.post(
                `/api/files/${projectId}`,
                formData,
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    },
                    onUploadProgress:(progressEvent)=>{
                        if(progressEvent.total){
                            dispatch({
                                type:"SET_UPLOAD_PROGRESS",
                                projectId,
                                payload:Math.round(
                                    progressEvent.loaded*100/progressEvent.total
                                ),
                            })
                        }
                    }
                }
            )
            dispatch({
                type:"ADD_PROJECT_FILE",
                projectId,
                payload:response.data.file,
            })
            refreshProjectAnalytics(projectId)
            form.reset()
        }catch(error){
            dispatch({
                type:"SET_UPLOAD_PROGRESS",
                projectId,
                payload:null,
            })
            dispatch({
                type:"SET_FILE_MESSAGE",
                projectId,
                payload:error.response?.data?.message||
                    "File upload failed. Please try again.",
            })
        }
    }

    async function handleDeleteFile(file,projectId){
        if(!window.confirm(`Delete "${file.originalName}"? This action cannot be undone.`)){
            return
        }

        dispatch({
            type:"SET_DELETING_FILE",
            payload:file._id,
        })
        dispatch({
            type:"SET_FILE_MESSAGE",
            projectId,
            payload:"",
        })
        try{
            await axios.delete(
                `/api/files/${projectId}/${file._id}`,
                {
                    headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`
                    }
                }
            )
            dispatch({
                type:"REMOVE_PROJECT_FILE",
                projectId,
                fileId:file._id,
            })
            refreshProjectAnalytics(projectId)
        }catch(error){
            dispatch({type:"SET_DELETING_FILE",payload:null})
            dispatch({
                type:"SET_FILE_MESSAGE",
                projectId,
                payload:error.response?.data?.message||
                    "Unable to delete this file.",
            })
        }
    }

  async function handleOpenFile(file, projectId, download=false) {
    const token = localStorage.getItem("token")

    const newTab = download ? null: window.open("about:blank", "_blank");

    try{
        const response = await axios.get(
        `/api/files/${projectId}/${file._id}`,
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

        setTimeout(()=> URL.revokeObjectURL(fileUrl), 1000);
    } else if(newTab){
        newTab.location.href=fileUrl;
    }else{
        URL.revokeObjectURL(fileUrl)
    }
    }catch(error){
        if (newTab) newTab.close();

        console.error("File open/download error:", error);

        dispatch({
            type:"SET_FILE_MESSAGE",
            projectId,
            payload:"Unable to open or download this file.",
        })
        
    }
  }

    function handleLogout(){
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        navigate("/")
    }

    return(
        <div className={`dashboard-shell${sidebarCollapsed?" sidebar-collapsed":""}${mobileMenuOpen?" mobile-menu-open":""}`}>
            <button
                type="button"
                className="mobile-sidebar-backdrop"
                aria-label="Close navigation menu"
                onClick={()=>setMobileMenuOpen(false)}
            />
            <aside className="dashboard-sidebar" aria-label="Main navigation">
                <div className="sidebar-brand">
                    <span className="brand-mark" aria-hidden="true">C</span>
                    <span className="brand-name">CollabSphere</span>
                    <button
                        type="button"
                        className="sidebar-collapse-button"
                        aria-label={sidebarCollapsed?"Expand sidebar":"Collapse sidebar"}
                        onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        <NavigationIcon name="collapse"/>
                    </button>
                </div>
                <p className="sidebar-section-label">Workspace</p>
                <nav className="sidebar-navigation">
                    {navigationItems.map((item)=>(
                        <button
                            type="button"
                            key={item.id}
                            className={`sidebar-nav-item${activeView===item.id?" active":""}`}
                            aria-current={activeView===item.id?"page":undefined}
                            title={sidebarCollapsed?item.label:undefined}
                            onClick={()=>handleNavigation(item.id)}
                        >
                            <NavigationIcon name={item.icon}/>
                            <span>{item.label}</span>
                            {item.id==="projects"&&state.projects.length>0&&(
                                <span className="sidebar-nav-count">{state.projects.length}</span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <button
                        type="button"
                        className="sidebar-theme-button"
                        onClick={()=>setTheme(theme==="dark"?"light":"dark")}
                    >
                        <NavigationIcon name={theme==="dark"?"sun":"moon"}/>
                        <span>Switch to {theme==="dark"?"light":"dark"} mode</span>
                    </button>
                    <div className="sidebar-profile">
                        <span className="profile-avatar">
                            {(currentUser.name||currentUser.email||"U").charAt(0).toUpperCase()}
                        </span>
                        <span className="profile-details">
                            <strong>{currentUser.name||"CollabSphere user"}</strong>
                            <small>{currentUser.email||"Signed in"}</small>
                        </span>
                        <button
                            type="button"
                            className="profile-logout"
                            onClick={handleLogout}
                            aria-label="Log out"
                            title="Log out"
                        >
                            <NavigationIcon name="logout"/>
                        </button>
                    </div>
                </div>
            </aside>

            <div className="dashboard-main-column">
                <header className="dashboard-topbar">
                    <button
                        type="button"
                        className="mobile-menu-button"
                        aria-label="Open navigation menu"
                        aria-expanded={mobileMenuOpen}
                        onClick={()=>setMobileMenuOpen(true)}
                    >
                        <NavigationIcon name="menu"/>
                    </button>
                    <div className="topbar-context">
                        <span>Workspace</span>
                        <span aria-hidden="true">/</span>
                        <strong>{page.title}</strong>
                    </div>
                    <button
                        type="button"
                        className="topbar-theme-button"
                        onClick={()=>setTheme(theme==="dark"?"light":"dark")}
                        aria-label={`Switch to ${theme==="dark"?"light":"dark"} mode`}
                        title={`Switch to ${theme==="dark"?"light":"dark"} mode`}
                    >
                        <NavigationIcon name={theme==="dark"?"sun":"moon"}/>
                    </button>
                </header>

                <main className="dashboard-content">
                <section className="page-heading">
                    <div>
                        <p className="page-eyebrow">COLLABSPHERE WORKSPACE</p>
                        <h1>{page.title}</h1>
                        <p>{page.description}</p>
                    </div>
                    {activeView==="dashboard"&&(
                        <button
                            type="button"
                            className="create-button page-primary-action"
                            onClick={()=>handleQuickAction("project")}
                        >
                            <NavigationIcon name="plus"/> New project
                        </button>
                    )}
                </section>
                {state.loadError&&(
                    <p className="dashboard-load-error" role="alert">
                        {state.loadError}
                    </p>
                )}

                {activeView==="dashboard"&&(
                    <>
                        <section className="overview-cards" aria-label="Workspace overview">
                            {[
                                {label:"Total projects",value:state.projects.length,icon:"layers",tone:"blue"},
                                {label:"Team members",value:memberIds.size,icon:"users",tone:"teal"},
                                {label:"Project notes",value:totalNotes,icon:"note",tone:"violet"},
                                {label:"Uploaded files",value:totalFiles,icon:"file",tone:"amber"},
                            ].map((item)=>(
                                <article className="overview-card" key={item.label}>
                                    <span className={`overview-card-icon ${item.tone}`}>
                                        <NavigationIcon name={item.icon}/>
                                    </span>
                                    <div>
                                        <span>{item.label}</span>
                                        <strong>
                                            {state.loading||
                                                state.loadError||
                                                (resourcesLoading&&
                                                    (item.label==="Project notes"||
                                                        item.label==="Uploaded files"))
                                                ?"—"
                                                :item.value}
                                        </strong>
                                    </div>
                                </article>
                            ))}
                        </section>
                        <section className="quick-actions-panel" aria-label="Quick actions">
                            <div>
                                <h2>Quick actions</h2>
                                <p>Jump into your team's work.</p>
                            </div>
                            <div className="quick-action-buttons">
                                <button type="button" className="quick-action-button" onClick={()=>handleQuickAction("project")}>
                                    <NavigationIcon name="plus"/> Create project
                                </button>
                                <button type="button" className="quick-action-button" onClick={()=>handleQuickAction("note")}>
                                    <NavigationIcon name="note"/> Add a note
                                </button>
                                <button type="button" className="quick-action-button" onClick={()=>handleQuickAction("file")}>
                                    <NavigationIcon name="file"/> Upload a file
                                </button>
                            </div>
                        </section>
                        <div className="dashboard-overview-grid">
                            <section className="overview-panel">
                                <div className="overview-panel-heading">
                                    <div><h2>Recent projects</h2><p>Your latest collaborative work</p></div>
                                    <button type="button" className="text-link-button" onClick={()=>handleNavigation("projects")}>
                                        View all
                                    </button>
                                </div>
                                {state.loading?(
                                    <p className="dashboard-empty-state">Loading your projects…</p>
                                ):state.loadError?(
                                    <p className="dashboard-empty-state">{state.loadError}</p>
                                ):state.projects.length===0?(
                                    <p className="dashboard-empty-state">Your projects will appear here when you create or join one.</p>
                                ):(
                                    <ul className="recent-project-list">
                                        {state.projects.slice(0,4).map((project)=>(
                                            <li key={project._id}>
                                                <span className="recent-project-mark">{project.name.charAt(0).toUpperCase()}</span>
                                                <div><strong>{project.name}</strong><small>{project.description||"No project description"}</small></div>
                                                <button type="button" onClick={()=>handleNavigation("projects")} aria-label={`Open ${project.name} in projects`}>
                                                    <span aria-hidden="true">→</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                            <section className="overview-panel">
                                <div className="overview-panel-heading">
                                    <div><h2>Recent activity</h2><p>Latest updates across your projects</p></div>
                                    <button type="button" className="text-link-button" onClick={()=>handleNavigation("analytics")}>
                                        View analytics
                                    </button>
                                </div>
                                {state.loading||analyticsLoading?(
                                    <p className="dashboard-empty-state">Loading activity…</p>
                                ):state.loadError?(
                                    <p className="dashboard-empty-state">Activity is unavailable until your projects load.</p>
                                ):recentActivities.length===0?(
                                    <p className="dashboard-empty-state">Activity will show here as your team works on projects.</p>
                                ):(
                                    <ol className="overview-activity-list">
                                        {recentActivities.map((activity)=>(
                                            <li key={activity._id}>
                                                <span className="activity-type-dot"/>
                                                <div><strong>{activity.user?.name||"Team member"}</strong><p>{activity.description}</p><time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString()}</time></div>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </section>
                        </div>
                    </>
                )}

                {activeView==="settings"&&(
                    <section className="settings-panel">
                        <div className="settings-panel-heading">
                            <span className="overview-card-icon blue"><NavigationIcon name="settings"/></span>
                            <div><h2>Appearance</h2><p>Choose a comfortable theme for your workspace.</p></div>
                        </div>
                        <div className="theme-choice-row">
                            <span><strong>Color theme</strong><small>Your selection is saved on this device.</small></span>
                            <button
                                type="button"
                                className="quick-action-button"
                                onClick={()=>setTheme(theme==="dark"?"light":"dark")}
                            >
                                <NavigationIcon name={theme==="dark"?"sun":"moon"}/>
                                {theme==="dark"?"Use light mode":"Use dark mode"}
                            </button>
                        </div>
                        <div className="settings-panel-heading account-settings-heading">
                            <span className="overview-card-icon teal"><NavigationIcon name="users"/></span>
                            <div><h2>Account</h2><p>You're signed in as {currentUser.email||"your account"}.</p></div>
                        </div>
                        <button type="button" className="project-action-button project-delete-button" onClick={handleLogout}>
                            <NavigationIcon name="logout"/> Log out
                        </button>
                    </section>
                )}

                {activeView==="projects"&&(
                <section className="project-form-card" id="create-project-form">
                    <h2>Create New Project</h2>

                    <form onSubmit={handleCreateProjects}>
                        <input
                        id="new-project-name"
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
                )}

                {activeView!=="dashboard"&&activeView!=="settings"&&(
                <section className="projects-section">
                    <div className="projects-section-heading">
                        <div>
                            <h2>{activeView==="projects"?"Your projects":page.title}</h2>
                            <p>{activeView==="projects"?"All projects you own or collaborate on.":"Browse project-specific "+page.title.toLowerCase()+" and manage them in context."}</p>
                        </div>
                        {activeView==="projects"&&(
                            <label className="project-search">
                                <span className="visually-hidden">Search projects</span>
                                <input
                                    type="search"
                                    value={projectSearch}
                                    onChange={(event)=>setProjectSearch(event.target.value)}
                                    placeholder="Search projects…"
                                />
                            </label>
                        )}
                    </div>
                    {state.loading?(
                        <p>Loading Projects...</p>
                    ):state.loadError?(
                        <p className="dashboard-load-error" role="alert">{state.loadError}</p>
                    ) : state.projects.length===0?(
                        <p>No project yet. Create your first project!</p>
                    ):visibleProjects.length===0?(
                        <p className="dashboard-empty-state">No projects match your search.</p>
                    ):(
                        <div className="project-grid">
                            {visibleProjects.map((project)=>(
                                <article
                                className="project-card"
                                key={project._id}
                                >
                                    <h3>{project.name}</h3>
                                    
                                    <p>
                                        {project.description||
                                        "No description provided"}
                                    </p>
                                    {(activeView==="projects"||activeView==="team")&&
                                        String(project.owner?._id||project.owner)===String(currentUserId)&&(
                                        <div className="project-actions">
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                onClick={()=>handleManageMembers(project)}
                                            >
                                                Manage Members
                                            </button>
                                            {activeView==="projects"&&(
                                            <>
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                onClick={()=>{
                                                    dispatch({
                                                        type:"SET_EDITING_PROJECT",
                                                        payload:{
                                                            _id:project._id,
                                                            name:project.name,
                                                            description:project.description||"",
                                                        },
                                                    })
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="project-action-button project-delete-button"
                                                onClick={()=>handleDeleteProject(project)}
                                                disabled={state.deletingProjectId===project._id}
                                            >
                                                {state.deletingProjectId===project._id
                                                    ?"Deleting..."
                                                    :"Delete"}
                                            </button>
                                            </>
                                            )}
                                        </div>
                                    )}
                                    {(activeView==="projects"||activeView==="team")&&
                                        String(project.owner?._id||project.owner)!==String(currentUserId)&&(
                                        <div className="project-actions">
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                onClick={()=>handleManageMembers(project)}
                                            >
                                                View Members
                                            </button>
                                        </div>
                                    )}
                                    {(activeView==="files"||activeView==="projects")&&(
                                    <>
                                    <form
                                        onSubmit={(e)=>handleUploadFile(e,project._id)}
                                        className="upload-form"
                                    >
                                        <label htmlFor={`file-${project._id}`}>
                                            Upload a document or code file (max 5 MB)
                                        </label>
                                        <input
                                            id={`file-${project._id}`}
                                            type="file"
                                            name="file"
                                            accept=".pdf,.txt,.md,.rtf,.doc,.docx,.csv,.json,.xml,.yaml,.yml,.html,.css,.js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.java,.c,.h,.cpp,.hpp,.go,.rs,.php,.rb,.sh,.sql,.png,.jpg,.jpeg"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="create-button"
                                            disabled={state.uploadProgress[project._id]!==undefined&&
                                                state.uploadProgress[project._id]!==null}
                                        >
                                            {state.uploadProgress[project._id]!==undefined&&
                                                state.uploadProgress[project._id]!==null
                                                ?"Uploading..."
                                                :"Upload File"}
                                        </button>
                                    </form>
                                    {state.uploadProgress[project._id]!==undefined&&
                                        state.uploadProgress[project._id]!==null&&(
                                        <div className="file-upload-progress" role="status">
                                            <progress
                                                max="100"
                                                value={state.uploadProgress[project._id]}
                                            />
                                            <span>{state.uploadProgress[project._id]}%</span>
                                        </div>
                                    )}
                                    {state.fileMessages[project._id]&&(
                                        <p className="file-status-message" role="status">
                                            {state.fileMessages[project._id]}
                                        </p>
                                    )}
                                    <div className="uploaded-files">
                                        <h4>Project Files</h4>
                                        {state.filesLoading[project._id]?(
                                            <p>Loading files...</p>
                                        ):(state.files[project._id]||[]).length===0?(
                                            <p>No files uploaded yet.</p>
                                        ):(
                                            <ul className="project-file-list">
                                                {(state.files[project._id]||[]).map((file)=>(
                                                    <li key={file._id}>
                                                        <div className="project-file-details">
                                                            <strong>{file.originalName}</strong>
                                                            <span>
                                                                {file.mimeType||"Unknown file type"}
                                                                {" · "}
                                                                Uploaded by {file.uploadedBy?.name||"Unknown"}
                                                                {" · "}
                                                                {file.createdAt
                                                                    ?new Date(file.createdAt).toLocaleDateString()
                                                                    :"Date unavailable"}
                                                            </span>
                                                        </div>
                                                        <div className="project-file-actions">
                                                            <button
                                                                type="button"
                                                                className="project-action-button"
                                                                onClick={()=>handleOpenFile(file,project._id,true)}
                                                            >
                                                                Download
                                                            </button>
                                                            {(String(project.owner?._id||project.owner)===String(currentUserId)||
                                                                String(file.uploadedBy?._id||file.uploadedBy)===String(currentUserId))&&(
                                                                <button
                                                                    type="button"
                                                                    className="project-action-button project-delete-button"
                                                                    onClick={()=>handleDeleteFile(file,project._id)}
                                                                    disabled={state.deletingFileId===file._id}
                                                                >
                                                                    {state.deletingFileId===file._id
                                                                        ?"Deleting..."
                                                                        :"Delete"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    </>
                                    )}
                                    {(activeView==="notes"||activeView==="projects")&&(
                                    <section className="project-notes-section">
                                        <div className="project-notes-heading">
                                            <h4>Project Notes</h4>
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                onClick={()=>openNoteEditor(project)}
                                            >
                                                Create Note
                                            </button>
                                        </div>
                                        {state.notesMessages[project._id]&&(
                                            <p className="notes-status-message" role="status">
                                                {state.notesMessages[project._id]}
                                            </p>
                                        )}
                                        {state.notesLoading[project._id]?(
                                            <p>Loading notes...</p>
                                        ):(state.notes[project._id]||[]).length===0?(
                                            <p>No notes yet. Create the first project note.</p>
                                        ):(
                                            <div className="project-notes-list">
                                                {(state.notes[project._id]||[]).map((note)=>(
                                                    <article className="project-note-card" key={note._id}>
                                                        <h5>{note.title}</h5>
                                                        <p className="project-note-meta">
                                                            By {note.author?.name||"Unknown author"}
                                                            {" · "}
                                                            {new Date(note.createdAt).toLocaleDateString()}
                                                        </p>
                                                        <MarkdownPreview content={note.content}/>
                                                        {(String(project.owner?._id||project.owner)===String(currentUserId)||
                                                            String(note.author?._id||note.author)===String(currentUserId))&&(
                                                            <div className="project-actions">
                                                                <button
                                                                    type="button"
                                                                    className="project-action-button"
                                                                    onClick={()=>openNoteEditor(project,note)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="project-action-button project-delete-button"
                                                                    onClick={()=>handleDeleteNote(project,note)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                    )}
                                    {(activeView==="analytics"||activeView==="projects")&&(
                                    <section className="project-analytics">
                                        <div className="project-analytics-heading">
                                            <div>
                                                <h4>Analytics &amp; Activity</h4>
                                                <p>Review project contributions and recent activity.</p>
                                            </div>
                                            {activeView!=="analytics"&&(
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                aria-expanded={Boolean(state.analyticsOpen[project._id])}
                                                onClick={()=>handleToggleAnalytics(project)}
                                            >
                                                {state.analyticsOpen[project._id]
                                                    ?"Hide Analytics"
                                                    :"View Analytics"}
                                            </button>
                                            )}
                                        </div>
                                        {(state.analyticsOpen[project._id]||activeView==="analytics")&&(()=>{
                                            const analytics=state.analytics[project._id]||{}
                                            const data=analytics.summary?analytics:null
                                            return(
                                                <div className="project-analytics-content">
                                                    {analytics.error&&(
                                                        <p className="analytics-error" role="alert">
                                                            {analytics.error}
                                                        </p>
                                                    )}
                                                    {analytics.loading&&!data&&(
                                                        <p role="status">Loading analytics...</p>
                                                    )}
                                                    {data&&(
                                                        <>
                                                            <div className="analytics-summary-grid">
                                                                {[
                                                                    ["Total projects",data.summary.totalProjects],
                                                                    ["Team members",data.summary.totalMembers],
                                                                    ["Notes",data.summary.totalNotes],
                                                                    ["Uploaded files",data.summary.totalFiles],
                                                                    ["Activities",data.summary.totalActivities],
                                                                ].map(([label,value])=>(
                                                                    <div className="analytics-summary-card" key={label}>
                                                                        <strong>{value}</strong>
                                                                        <span>{label}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="analytics-chart-grid">
                                                                <section className="analytics-chart-card">
                                                                    <h5>Member contributions</h5>
                                                                    <ContributionChart members={data.memberContributions||[]}/>
                                                                </section>
                                                                <section className="analytics-chart-card">
                                                                    <h5>Activity distribution</h5>
                                                                    <ActivityPieChart distribution={data.activityDistribution||[]}/>
                                                                </section>
                                                                <section className="analytics-chart-card analytics-trend-card">
                                                                    <h5>Activity over the last 14 days</h5>
                                                                    <ActivityLineChart activityOverTime={data.activityOverTime||[]}/>
                                                                </section>
                                                            </div>
                                                            <section className="analytics-timeline">
                                                                <div className="analytics-timeline-heading">
                                                                    <h5>Recent activity</h5>
                                                                    <label>
                                                                        <span>Filter:</span>
                                                                        <select
                                                                            value={analytics.filter||"all"}
                                                                            onChange={(event)=>{
                                                                                const filter=event.target.value
                                                                                dispatch({
                                                                                    type:"SET_ANALYTICS_FILTER",
                                                                                    projectId:project._id,
                                                                                    payload:filter,
                                                                                })
                                                                                loadProjectActivities(project._id,filter)
                                                                            }}
                                                                        >
                                                                            <option value="all">All activity</option>
                                                                            {Object.entries(activityLabels).map(([type,label])=>(
                                                                                <option key={type} value={type}>{label}</option>
                                                                            ))}
                                                                        </select>
                                                                    </label>
                                                                </div>
                                                                {analytics.loading&&(
                                                                    <p role="status">Updating activity...</p>
                                                                )}
                                                                {data.activities?.length?(
                                                                    <ol className="analytics-activity-list">
                                                                        {data.activities.map((activity)=>(
                                                                            <li key={activity._id}>
                                                                                <span
                                                                                    className="activity-type-dot"
                                                                                    style={{
                                                                                        backgroundColor:chartColors[
                                                                                            Object.keys(activityLabels).indexOf(activity.type)%
                                                                                            chartColors.length
                                                                                        ],
                                                                                    }}
                                                                                />
                                                                                <div>
                                                                                    <strong>{activity.user?.name||"Unknown user"}</strong>
                                                                                    <p>{activity.description}</p>
                                                                                    <time dateTime={activity.createdAt}>
                                                                                        {new Date(activity.createdAt).toLocaleString()}
                                                                                    </time>
                                                                                </div>
                                                                                <span className="activity-type-label">
                                                                                    {activityLabels[activity.type]||activity.type}
                                                                                </span>
                                                                            </li>
                                                                        ))}
                                                                    </ol>
                                                                ):!analytics.loading?(
                                                                    <p className="analytics-empty">No activity matches this filter.</p>
                                                                ):null}
                                                            </section>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </section>
                                    )}
                                    {(activeView==="ai"||activeView==="projects")&&(
                                    <section className="project-ai-assistant">
                                        <h4>Project AI Assistant</h4>
                                        <p>Ask questions, summarize project notes, or get suggestions based on project context.</p>
                                        <label className="visually-hidden" htmlFor={`project-ai-question-${project._id}`}>
                                            Ask a question about this project
                                        </label>
                                        <textarea
                                            id={`project-ai-question-${project._id}`}
                                            rows="2"
                                            maxLength={2000}
                                            value={state.projectAi[project._id]?.question||""}
                                            onChange={(e)=>dispatch({
                                                type:"SET_PROJECT_AI_QUESTION",
                                                projectId:project._id,
                                                payload:e.target.value,
                                            })}
                                            placeholder="Ask a question about this project..."
                                        />
                                        <div className="project-actions">
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                onClick={()=>handleProjectAI(project,"question")}
                                                disabled={state.projectAi[project._id]?.loading}
                                            >
                                                Ask AI
                                            </button>
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                onClick={()=>handleProjectAI(project,"summary")}
                                                disabled={state.projectAi[project._id]?.loading}
                                            >
                                                Summarize
                                            </button>
                                            <button
                                                type="button"
                                                className="project-action-button"
                                                onClick={()=>handleProjectAI(project,"suggestions")}
                                                disabled={state.projectAi[project._id]?.loading}
                                            >
                                                Suggestions
                                            </button>
                                        </div>
                                        {state.projectAi[project._id]?.loading&&(
                                            <p className="ai-status-message" role="status">
                                                Gemini is thinking...
                                            </p>
                                        )}
                                        {state.projectAi[project._id]?.error&&(
                                            <p className="ai-status-message error" role="alert">
                                                {state.projectAi[project._id].error}
                                            </p>
                                        )}
                                        {state.projectAi[project._id]?.notice&&(
                                            <p className="ai-status-message success" role="status">
                                                {state.projectAi[project._id].notice}
                                            </p>
                                        )}
                                        {state.projectAi[project._id]?.response&&(
                                            <div className="ai-response-card">
                                                <MarkdownPreview content={state.projectAi[project._id].response}/>
                                                <button
                                                    type="button"
                                                    className="project-action-button"
                                                    onClick={()=>handleCopyText(
                                                        state.projectAi[project._id].response,
                                                        ()=>dispatch({
                                                            type:"SET_PROJECT_AI_NOTICE",
                                                            projectId:project._id,
                                                            payload:"AI response copied.",
                                                        }),
                                                        (message)=>dispatch({
                                                            type:"SET_PROJECT_AI_ERROR",
                                                            projectId:project._id,
                                                            payload:message,
                                                        })
                                                    )}
                                                >
                                                    Copy response
                                                </button>
                                            </div>
                                        )}
                                    </section>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
                )}
                {state.editingProject&&(
                    <div className="project-modal-backdrop">
                        <section
                            className="project-edit-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="edit-project-title"
                        >
                            <h2 id="edit-project-title">Edit Project</h2>
                            {state.editError&&(
                                <p className="project-edit-error" role="alert">
                                    {state.editError}
                                </p>
                            )}
                            <form onSubmit={handleUpdateProject}>
                                <label htmlFor="edit-project-name">Project Name</label>
                                <input
                                    id="edit-project-name"
                                    type="text"
                                    value={state.editingProject.name}
                                    onChange={(e)=>dispatch({
                                        type:"SET_EDIT_NAME",
                                        payload:e.target.value,
                                    })}
                                    required
                                    maxLength={100}
                                    autoFocus
                                />
                                <label htmlFor="edit-project-description">Project Description</label>
                                <textarea
                                    id="edit-project-description"
                                    rows="4"
                                    value={state.editingProject.description}
                                    onChange={(e)=>dispatch({
                                        type:"SET_EDIT_DESCRIPTION",
                                        payload:e.target.value,
                                    })}
                                    maxLength={2000}
                                />
                                <div className="project-modal-actions">
                                    <button
                                        type="button"
                                        className="project-action-button"
                                        onClick={()=>dispatch({
                                            type:"SET_EDITING_PROJECT",
                                            payload:null,
                                        })}
                                        disabled={state.savingProject}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="create-button"
                                        disabled={state.savingProject}
                                    >
                                        {state.savingProject?"Saving...":"Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}
                {state.managingProject&&(
                    <div className="project-modal-backdrop">
                        <section
                            className="project-edit-modal member-management-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="manage-members-title"
                        >
                            <h2 id="manage-members-title">
                                Manage Members — {state.managingProject.name}
                            </h2>
                            {state.memberMessage&&(
                                <p
                                    className={`member-message ${state.memberMessageType}`}
                                    role={state.memberMessageType==="error"?"alert":"status"}
                                >
                                    {state.memberMessage}
                                </p>
                            )}
                            {String(state.managingProject.owner?._id||state.managingProject.owner)===String(currentUserId)&&(
                                <form
                                    className="invite-member-form"
                                    onSubmit={handleInviteMember}
                                >
                                    <label htmlFor="invite-member-email">
                                        Invite a registered user by email
                                    </label>
                                    <div className="invite-member-controls">
                                        <input
                                            id="invite-member-email"
                                            type="email"
                                            value={state.inviteEmail}
                                            onChange={(e)=>dispatch({
                                                type:"SET_INVITE_EMAIL",
                                                payload:e.target.value,
                                            })}
                                            placeholder="name@example.com"
                                            maxLength={254}
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="create-button"
                                            disabled={state.memberAction}
                                        >
                                            {state.memberAction?"Please wait...":"Invite"}
                                        </button>
                                    </div>
                                </form>
                            )}
                            <h3 className="member-list-heading">Current Members</h3>
                            {state.membersLoading?(
                                <p>Loading members...</p>
                            ):state.projectMembers.length===0?(
                                <p>No project members found.</p>
                            ):(
                                <ul className="project-member-list">
                                    {state.projectMembers.map((member)=>(
                                        <li key={member._id}>
                                            <div>
                                                <strong>{member.name}</strong>
                                                <span>{member.email}</span>
                                                {String(member._id)===String(
                                                    state.managingProject.owner?._id||
                                                    state.managingProject.owner
                                                )&&(
                                                    <span className="member-owner-label">Owner</span>
                                                )}
                                            </div>
                                            {String(state.managingProject.owner?._id||state.managingProject.owner)===String(currentUserId)&&
                                                String(member._id)!==String(
                                                    state.managingProject.owner?._id||
                                                    state.managingProject.owner
                                                )&&(
                                                    <button
                                                        type="button"
                                                        className="project-action-button project-delete-button"
                                                        onClick={()=>handleRemoveMember(member)}
                                                        disabled={state.memberAction}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="project-modal-actions">
                                <button
                                    type="button"
                                    className="project-action-button"
                                    onClick={()=>dispatch({
                                        type:"SET_MANAGING_PROJECT",
                                        payload:null,
                                    })}
                                    disabled={state.memberAction}
                                >
                                    Close
                                </button>
                            </div>
                        </section>
                    </div>
                )}
                {state.noteEditor&&(
                    <div className="project-modal-backdrop">
                        <section
                            className="project-edit-modal note-editor-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="note-editor-title"
                        >
                            <h2 id="note-editor-title">
                                {state.noteEditor._id?"Edit Note":"Create Note"}
                            </h2>
                            {state.notesMessages[state.noteEditor.projectId]&&(
                                <p className="notes-status-message" role="alert">
                                    {state.notesMessages[state.noteEditor.projectId]}
                                </p>
                            )}
                            <form onSubmit={handleSaveNote}>
                                <label htmlFor="note-title">Note Title</label>
                                <input
                                    id="note-title"
                                    type="text"
                                    value={state.noteEditor.title}
                                    onChange={(e)=>dispatch({
                                        type:"SET_NOTE_TITLE",
                                        payload:e.target.value,
                                    })}
                                    maxLength={150}
                                    required
                                    autoFocus
                                />
                                <div className="markdown-editor-heading">
                                    <label htmlFor="note-content">Markdown Content</label>
                                    <div className="markdown-preview-toggle" role="group" aria-label="Markdown editor mode">
                                        <button
                                            type="button"
                                            className={!state.notePreview?"active":""}
                                            onClick={()=>dispatch({
                                                type:"SET_NOTE_PREVIEW",
                                                payload:false,
                                            })}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className={state.notePreview?"active":""}
                                            onClick={()=>dispatch({
                                                type:"SET_NOTE_PREVIEW",
                                                payload:true,
                                            })}
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </div>
                                {state.notePreview?(
                                    <div className="note-editor-preview">
                                        {state.noteEditor.content.trim()
                                            ? <MarkdownPreview content={state.noteEditor.content}/>
                                            : <p>Markdown preview will appear here.</p>}
                                    </div>
                                ):(
                                    <textarea
                                        id="note-content"
                                        className="note-markdown-input"
                                        value={state.noteEditor.content}
                                        onChange={(e)=>dispatch({
                                            type:"SET_NOTE_CONTENT",
                                            payload:e.target.value,
                                        })}
                                        maxLength={50000}
                                        placeholder={"# Heading\n\nWrite your note in Markdown...\n\n- Use **bold**, *italic*, [links](https://example.com)\n- Add code with fenced blocks:\n```js\nconsole.log('Hello');\n```"}
                                        required
                                    />
                                )}
                                <p className="markdown-help">
                                    Supports headings, bold, italic, lists, links and fenced code blocks.
                                </p>
                                <section className="note-ai-assistant">
                                    <h3>AI Note Assistant</h3>
                                    <div className="note-ai-controls">
                                        <label htmlFor="note-ai-action">AI task</label>
                                        <select
                                            id="note-ai-action"
                                            value={state.noteAiAction}
                                            onChange={(e)=>dispatch({
                                                type:"SET_NOTE_AI_ACTION",
                                                payload:e.target.value,
                                            })}
                                            disabled={state.noteAiLoading}
                                        >
                                            <option value="improve">Improve this note</option>
                                            <option value="generate">Generate note content</option>
                                            <option value="summarize">Summarize this note</option>
                                            <option value="grammar">Fix grammar</option>
                                        </select>
                                        <button
                                            type="button"
                                            className="project-action-button"
                                            onClick={handleNoteAI}
                                            disabled={state.noteAiLoading}
                                        >
                                            {state.noteAiLoading
                                                ?"Gemini is working..."
                                                :"Improve with AI"}
                                        </button>
                                    </div>
                                    <label htmlFor="note-ai-instructions">
                                        Optional instructions
                                    </label>
                                    <textarea
                                        id="note-ai-instructions"
                                        rows="2"
                                        maxLength={2000}
                                        value={state.noteAiInstructions}
                                        onChange={(e)=>dispatch({
                                            type:"SET_NOTE_AI_INSTRUCTIONS",
                                            payload:e.target.value,
                                        })}
                                        placeholder="Add guidance for the AI (optional)"
                                        disabled={state.noteAiLoading}
                                    />
                                    {state.noteAiError&&(
                                        <p className="ai-status-message error" role="alert">
                                            {state.noteAiError}
                                        </p>
                                    )}
                                    {state.noteAiNotice&&(
                                        <p className="ai-status-message success" role="status">
                                            {state.noteAiNotice}
                                        </p>
                                    )}
                                    {state.noteAiResult&&(
                                        <div className="ai-generated-content">
                                            <h4>Review generated draft</h4>
                                            <div className="ai-response-card">
                                                <MarkdownPreview content={state.noteAiResult}/>
                                            </div>
                                            <div className="project-actions">
                                                <button
                                                    type="button"
                                                    className="project-action-button"
                                                    onClick={()=>handleCopyText(
                                                        state.noteAiResult,
                                                        ()=>dispatch({
                                                            type:"SET_NOTE_AI_NOTICE",
                                                            payload:"AI draft copied.",
                                                        }),
                                                        (message)=>dispatch({
                                                            type:"SET_NOTE_AI_ERROR",
                                                            payload:message,
                                                        })
                                                    )}
                                                >
                                                    Copy draft
                                                </button>
                                                <button
                                                    type="button"
                                                    className="project-action-button"
                                                    onClick={()=>{
                                                        dispatch({
                                                            type:"SET_NOTE_CONTENT",
                                                            payload:state.noteAiResult,
                                                        })
                                                        dispatch({
                                                            type:"SET_NOTE_AI_NOTICE",
                                                            payload:"Draft inserted into the editor. Review or edit it before saving.",
                                                        })
                                                    }}
                                                >
                                                    Use this content
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </section>
                                <div className="project-modal-actions">
                                    <button
                                        type="button"
                                        className="project-action-button"
                                        onClick={()=>dispatch({
                                            type:"SET_NOTE_EDITOR",
                                            payload:null,
                                        })}
                                        disabled={state.savingNote}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="create-button"
                                        disabled={state.savingNote}
                                    >
                                        {state.savingNote?"Saving...":"Save Note"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}
            </main>
            </div>
        </div>
    )
}

export default Dashboard;