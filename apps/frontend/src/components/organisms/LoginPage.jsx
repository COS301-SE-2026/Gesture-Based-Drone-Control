import { useNavigate } from "react-router-dom";
import AuthLayout from "../molecules/AuthLayout"
import LoginForm from "../molecules/LoginForm";
import {useForm} from "../../hooks/useForm"

export default function LoginPage(){
  const navigate = useNavigate()

  const{formData, errors,isLoading,handleChange, handleSubmit } = useForm(
    {email:"" , password:"" , rememberMe: false},
    ()=> navigate("/")
  
  )
  return (
    <AuthLayout
    panelTitle="Welcome Back"
    panelSubtitle = "Continue your Drone joutney with Codex Merchants"
    >
      <LoginForm
      formData = {formData}
      errors = {errors}
      isLoading ={isLoading}
      handleChange={handleChange}
      handleSubmit = {handleSubmit}
      />
    </AuthLayout>
  )
}