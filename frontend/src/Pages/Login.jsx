import {Link, useNavigate} from "react-router-dom"
import axios from "axios"
import "../App.css"
 function Login (){
    const navigate=useNavigate()

    async function handleLogin(e) {
        e.preventDefault()

        const email=e.target.email.value
        const password=e.target.password.value;  
        
        try{
            const response=await axios.post(
                "http://localhost:5000/api/auth/login",
                {email,password}
            );

            localStorage.setItem("token",response.data.token)
            localStorage.setItem("user",JSON.stringify(response.data.user))

            alert("Login successful!")
            navigate("/dashboard")
        }catch(error){
            alert(error.response?.data?.message||"Login failed. Please try again.")
        }
    }

  
    return(
        <main className="login-page">
            <section className="login-card">
                <h1>CollabSphere</h1>
                <p className="subtitle">Your space to build together.</p>

                <h2>Welcome back</h2>
                <p className="description">Log in to continue to your workplace.</p>

                <form onSubmit={handleLogin}>
                    <label htmlFor="email">Email address</label>
                    <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    />

                    <label htmlFor="password">Password</label>
                    <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    />

                    <button type="submit">Log in</button>
                </form>

                <p className="register-link">
                    Don't have an account? <Link to="/register">Register</Link>
                </p>
            </section>
        </main>
    )
 }

 export default Login;