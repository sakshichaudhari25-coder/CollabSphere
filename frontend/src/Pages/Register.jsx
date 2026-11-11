import {useState} from "react"
import {Link, useNavigate} from "react-router-dom"
import axios from "../api"
import AuthLayout, {AuthIcon, AuthPasswordField} from "./AuthLayout"
import "../App.css"

function Register(){
    const navigate=useNavigate()
    const [name,setName]=useState("")
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
    const [confirmPassword,setConfirmPassword]=useState("")
    const [showPassword,setShowPassword]=useState(false)
    const [showConfirmPassword,setShowConfirmPassword]=useState(false)
    const [isSubmitting,setIsSubmitting]=useState(false)
    const [error,setError]=useState("")

    async function handleRegister(event){
        event.preventDefault()
        setError("")

        if(!name.trim()){
            setError("Enter your name to create an account.")
            return
        }

        if(password!==confirmPassword){
            setError("Your passwords don't match. Please check and try again.")
            return
        }

        setIsSubmitting(true)
        try{
            const response=await axios.post(
                "/api/auth/register",
                {name:name.trim(),email,password}
            )
            navigate("/",{
                state:{registrationMessage:response.data.message}
            })
        }catch(requestError){
            setError(
                requestError.response?.data?.message||
                "We couldn't create your account. Please try again."
            )
        }finally{
            setIsSubmitting(false)
        }
    }

    return(
        <AuthLayout
            mode="register"
            heading="Create your account"
            description="Bring your team and your best work together."
        >
            <form className="auth-form" onSubmit={handleRegister}>
                <label className="auth-field-label" htmlFor="register-name">
                    Full name
                </label>
                <div className="auth-input-wrap">
                    <AuthIcon name="user"/>
                    <input
                        id="register-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(event)=>setName(event.target.value)}
                        maxLength={80}
                        required
                    />
                </div>

                <label className="auth-field-label" htmlFor="register-email">
                    Email address
                </label>
                <div className="auth-input-wrap">
                    <AuthIcon name="email"/>
                    <input
                        id="register-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(event)=>setEmail(event.target.value)}
                        required
                    />
                </div>

                <label className="auth-field-label" htmlFor="register-password">
                    Password
                </label>
                <AuthPasswordField
                    id="register-password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event)=>setPassword(event.target.value)}
                    visible={showPassword}
                    onToggle={()=>setShowPassword((visible)=>!visible)}
                    minLength={8}
                    required
                />

                <label className="auth-field-label" htmlFor="confirm-password">
                    Confirm password
                </label>
                <AuthPasswordField
                    id="confirm-password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    onChange={(event)=>setConfirmPassword(event.target.value)}
                    visible={showConfirmPassword}
                    onToggle={()=>setShowConfirmPassword((visible)=>!visible)}
                    minLength={8}
                    required
                />

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
                            Creating account…
                        </>
                    ):(
                        <>Create account <AuthIcon name="arrow"/></>
                    )}
                </button>
            </form>

            <p className="auth-switch-prompt">
                Already have an account? <Link to="/">Sign in</Link>
            </p>
        </AuthLayout>
    )
}

export default Register
