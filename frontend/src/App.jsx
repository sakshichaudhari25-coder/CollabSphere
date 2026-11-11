import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Dashboard from "./Pages/Dashboard";
import { Routes, Route, Navigate} from "react-router-dom";
import { useEffect } from "react";

function App(){
  useEffect(()=>{
    document.documentElement.dataset.theme=
      localStorage.getItem("collabsphere-theme")||"light";
  },[])

  return(
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
