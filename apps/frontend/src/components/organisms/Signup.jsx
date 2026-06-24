import {useState} from "react"
import { useNavigate } from "react-router-dom"
import AuthLayout from "../molecules/AuthLayout"
import SignupForm from "../molecules/SignupForm"

export default function SignUp(){
  const navigate = useNavigate()
  const[formData, setFormData] = useState({
    firstName : "",
    lastName : "",
    email: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: "",
  })
  const[erors,setErrors]= useState({})
  const [ isLoading,setIsLoading]= useState(false)

  const handleChange = (e) => {
    const { name, value,type,checked} = e.target 
    setFormData((prev)=> ({
      ...ProgressEvent,
      [name]:type === "checkbox"? checked : value,
    }))
      if (error[name]){
        setErrors((prev)=> ({
          ...prev,
          [name]:"",

        }))
      
  }
}

const handleSubmit = async (e) => {
  e.preventDefault()
  const newErr = {
    firstName: !formData.firstName.trim() ? "First Name is required" : "",
    lastName : !formData.lastName.trim() ? "Last Name is required" : "",
    email: !formData.email ? " Email is required ": "",
    dateOfBirth: !formData.dateOfBirth ? " Date of birth is required ": "",
    password: !formData.password ? " Password is required ": "",
    confirmPassword: !formData.confirmPassword ? " Please confirm your password ": "",
    agreeToTerms:!formData.agreeToTerms ? "You must agree to continue" : "",

  }

  const filteredErrors = Object.fromEntries(
    Object.entries(newErr).filter(([,v])=> v !== "")
  )

  if (Object.keys(filteredErrors).length >0){
    setErrors(filteredErrors)
    return
  }

  setIsLoading(true)
  setTimeout(()=> {
    setIsLoading(false)
    navigate("/login")
  },1500)
}

return(
  <AuthLayout
  panelTitle = "Join Us"
  panelSubtitle = "Start your adventure with Codex Merchants today"
  >
    <SignupForm
    fromData = {formData}
    errors = {errors}
    isLoading = {isLoading}
    handleChange={handleChange}
    handleSubmit = {handleSubmit}
    />
  </AuthLayout>
)

}