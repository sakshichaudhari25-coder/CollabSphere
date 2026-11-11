import {useState} from "react"
import {Link, useLocation, useNavigate} from "react-router-dom"
import axios from "../api"
import AuthLayout, {AuthIcon, AuthPasswordField} from "./AuthLayout"
import "../App.css"

function Login(){
    const navigate=useNavigate()
    const location=useLocation()
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
    const [showPassword,setShowPassword]=useState(false)
    const [isSubmitting,setIsSubmitting]=useState(false)
    const [error,setError]=useState("")
    const [showRecoveryMessage,setShowRecoveryMessage]=useState(false)

    async function handleLogin(event){
        event.preventDefault()
        setError("")
        setShowRecoveryMessage(false)
        setIsSubmitting(true)

        try{
            const response=await axios.post(
                "/api/auth/login",
                {email,password}
            )

            localStorage.setItem("token",response.data.token)
            localStorage.setItem("user",JSON.stringify(response.data.user))
            navigate("/dashboard")
        }catch(requestError){
            setError(
                requestError.response?.data?.message||
                "We couldn't sign you in. Check your details and try again."
            )
        }finally{
            setIsSubmitting(false)
        }
    }

    return(
        <AuthLayout
            mode="login"
            heading="Welcome back"
            description="Sign in to pick up where your team left off."
        >
            <form className="auth-form" onSubmit={handleLogin}>
                <label className="auth-field-label" htmlFor="login-email">
                    Email address
                </label>
                <div className="auth-input-wrap">
                    <AuthIcon name="email"/>
                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(event)=>setEmail(event.target.value)}
                        required
                    />
                </div>

                <div className="auth-password-label-row">
                    <label className="auth-field-label" htmlFor="login-password">
                        Password
                    </label>
                    <button
                        className="auth-text-button"
                        type="button"
                        aria-expanded={showRecoveryMessage}
                        onClick={()=>setShowRecoveryMessage((visible)=>!visible)}
                    >
                        Forgot password?
                    </button>
                </div>
                <AuthPasswordField
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event)=>setPassword(event.target.value)}
                    visible={showPassword}
                    onToggle={()=>setShowPassword((visible)=>!visible)}
                    required
                />

                {showRecoveryMessage&&(
                    <p className="auth-inline-note" role="status">
                        Password recovery is not available yet. Please contact your workspace administrator.
                    </p>
                )}
                {location.state?.registrationMessage&&(
                    <p className="auth-form-message success" role="status">
                        {location.state.registrationMessage}
                    </p>
                )}
                {error&&(
                    <p className="auth-form-message error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    className="auth-submit-button"
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting?(
                        <>
                            <span className="auth-spinner" aria-hidden="true"/>
                            Signing in…
                        </>
                    ):(
                        <>Sign in <AuthIcon name="arrow"/></>
                    )}
                </button>
            </form>

            <p className="auth-switch-prompt">
                New to CollabSphere? <Link to="/register">Create an account</Link>
            </p>
        </AuthLayout>
    )
}

export default Login
