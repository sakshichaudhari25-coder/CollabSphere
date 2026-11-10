import {Link, useNavigate} from "react-router-dom"
import axios from "axios"
import "../App.css"

function Register(){
    const navigate=useNavigate()

    async function handleRegister(e) {
        e.preventDefault()

        const name=e.target.name.value;
        const email=e.target.email.value;
        const password=e.target.password.value;

        try{
            const response=await axios.post(
                "http://localhost:5000/api/auth/register",
                 {name, email, password}    
            );

            alert(response.data.message)
            navigate("/")
        }catch(error){
            alert(error.response?.data?.message||
                "Registration failed. Please try again"
)
        }
    }


return(
    <main className="login-page">
        <section className="login-card">
            <h1>CollabSphere</h1>
            <p className="subtitle">Create your developer  workplace.</p>

            <h2>Create an account</h2>
            <p className="description">
                Join your team and start collaborating.
            </p>
            <form onSubmit={handleRegister}>
                <label htmlFor="name">Full Name</label>
                <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your name"
                required
                />
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
                placeholder="At least 8 Characters"
                minLength={8}
                required
                />

                <button type="submit">Create account</button>
            </form>

            <p className="register-link">
                Already have an account? <Link to="/">Log in</Link>
            </p>
        </section>
    </main>
)
}
export default Register;