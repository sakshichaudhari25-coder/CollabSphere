import {useEffect,useState} from "react"
import {Link} from "react-router-dom"

const highlights=[
    {
        icon:"layers",
        title:"Smart Project Management",
        description:"Bring plans, project updates, and decisions into one clear workspace.",
    },
    {
        icon:"sparkles",
        title:"AI-Powered Collaboration",
        description:"Use contextual AI to turn notes and code into sharper ideas.",
    },
    {
        icon:"activity",
        title:"Team Activity & Analytics",
        description:"Track contributions and keep everyone aligned with shared activity.",
    },
]

const iconPaths={
    email:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    user:<><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    lock:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    eye:<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    eyeOff:<><path d="m3 3 18 18"/><path d="M10.6 6.1A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.8M6.2 6.3C3.5 8 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
    layers:<><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>,
    sparkles:<><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></>,
    activity:<><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    arrow:<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    moon:<><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></>,
}

export function AuthIcon({name,className=""}){
    return(
        <svg
            aria-hidden="true"
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {iconPaths[name]}
        </svg>
    )
}

export function AuthPasswordField({
    id,
    name,
    autoComplete,
    placeholder,
    value,
    onChange,
    visible,
    onToggle,
    ...inputProps
}){
    return(
        <div className="auth-input-wrap">
            <AuthIcon name="lock"/>
            <input
                id={id}
                name={name}
                type={visible?"text":"password"}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                {...inputProps}
            />
            <button
                className="auth-visibility-button"
                type="button"
                aria-label={visible?"Hide password":"Show password"}
                aria-pressed={visible}
                onClick={onToggle}
            >
                <AuthIcon name={visible?"eyeOff":"eye"}/>
            </button>
        </div>
    )
}

function AuthLayout({mode,heading,description,children}){
    const [theme,setTheme]=useState(()=>{
        try{
            return localStorage.getItem("collabsphere-theme")==="dark"?"dark":"light"
        }catch{
            return "light"
        }
    })

    useEffect(()=>{
        document.documentElement.dataset.theme=theme
        try{
            localStorage.setItem("collabsphere-theme",theme)
        }catch{
            // The page can still use the selected theme when storage is unavailable.
        }
    },[theme])

    return(
        <main className={`auth-layout auth-layout--${mode}`}>
            <section className="auth-form-panel" aria-labelledby="auth-heading">
                <div className="auth-form-topbar">
                    <Link className="auth-mobile-brand" to="/" aria-label="CollabSphere home">
                        <span className="auth-brand-mark">C</span>
                        <span>CollabSphere</span>
                    </Link>
                    <button
                        type="button"
                        className="auth-theme-toggle"
                        aria-label={`Switch to ${theme==="dark"?"light":"dark"} mode`}
                        title={`Switch to ${theme==="dark"?"light":"dark"} mode`}
                        onClick={()=>setTheme((current)=>current==="dark"?"light":"dark")}
                    >
                        <AuthIcon name={theme==="dark"?"sun":"moon"}/>
                    </button>
                </div>
                <div className="auth-form-content">
                    <div className="auth-form-heading">
                        <span className="auth-form-eyebrow">
                            {mode==="login"?"YOUR WORKSPACE AWAITS":"GET STARTED"}
                        </span>
                        <h1 id="auth-heading">{heading}</h1>
                        <p>{description}</p>
                    </div>
                    {children}
                    <p className="auth-legal-note">
                        By continuing, you agree to use CollabSphere responsibly with your team.
                    </p>
                </div>
            </section>

            <aside className="auth-visual-panel">
                <div className="auth-visual-orb auth-visual-orb--one"/>
                <div className="auth-visual-orb auth-visual-orb--two"/>
                <div className="auth-visual-content">
                    <Link className="auth-brand" to="/" aria-label="CollabSphere home">
                        <span className="auth-brand-mark">C</span>
                        <span>CollabSphere</span>
                    </Link>
                    <div className="auth-visual-copy">
                        <span className="auth-visual-kicker">
                            COLLABORATION, WITHOUT THE FRICTION
                        </span>
                        <h2>
                            <span className="auth-headline-highlight">Build better,</span>
                            {" "}together.
                        </h2>
                        <p>
                            CollabSphere brings your people, projects, and ideas into one
                            <strong> focused workspace</strong>—so your team can spend less time
                            coordinating and more time creating.
                        </p>
                    </div>
                    <div className="auth-feature-list">
                        {highlights.map((feature)=>(
                            <article className="auth-feature" key={feature.title}>
                                <span className="auth-feature-icon">
                                    <AuthIcon name={feature.icon}/>
                                </span>
                                <span className="auth-feature-copy">
                                    <strong>{feature.title}</strong>
                                    <span>{feature.description}</span>
                                </span>
                            </article>
                        ))}
                    </div>
                    <div className="auth-visual-footer">
                        <span className="auth-footer-dot"/>
                        <span>One connected workspace for your team.</span>
                    </div>
                </div>
                <div className="auth-visual-grid" aria-hidden="true"/>
            </aside>
        </main>
    )
}

export default AuthLayout
