import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthLayout from "../molecules/AuthLayout"
import SignupForm from "../molecules/SignupForm"
import { API_BASE_URL } from "../../lib/api"

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErr = {
      firstName: !formData.firstName.trim() ? "First Name is required" : "",
      lastName: !formData.lastName.trim() ? "Last Name is required" : "",
      email: !formData.email ? " Email is required " : "",
      password: !formData.password ? " Password is required " : "",
      confirmPassword: !formData.confirmPassword
        ? " Please confirm your password "
        : formData.password !== formData.confirmPassword
          ? "Passwords do not match"
          : "",

      agreeToTerms: !formData.agreeToTerms ? "You must agree to continue" : "",
    }

    const filteredErrors = Object.fromEntries(
      Object.entries(newErr).filter(([, v]) => v !== "")
    )

    if (Object.keys(filteredErrors).length > 0) {
      setErrors(filteredErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
        }),
      })

      if (response.status === 422) {
        const data = await response.json()
        const fieldErrors = {}
        for (const err of data.detail) {
          const field = err.loc[err.loc.length - 1]
          fieldErrors[field] = err.msg
        }
        setErrors(fieldErrors)
        setIsLoading(false)
        return
      }

      if (response.status === 409) {
        setErrors({ general: "An account with this email already exists. " })
        setIsLoading(false)
        return
      }

      if (response.status !== 201) {
        setErrors({ general: "Something went wrong, try again. " })
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      navigate("/login")
    } catch {
      setErrors({ general: "Could not reach the server...try again" })
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      panelTitle="Join Us"
      panelSubtitle="Start your adventure with Codex Merchants today"
    >
      <SignupForm
        formData={formData}
        errors={errors}
        isLoading={isLoading}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />
    </AuthLayout>
  )
}
