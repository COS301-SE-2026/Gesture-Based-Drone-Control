import { useState } from "react"
import { API_BASE_URL } from "../lib/api"

export function useForm(initialState, onSuccess) {
  const [formData, setFormData] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e, validateFn) => {
    e.preventDefault()
    const newErr = validateFn()
    if (Object.keys(newErr).length > 0) {
      setErrors(newErr)
      return
    }
    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
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

      if(response.status === 401){
        setErrors({general: "Invalid email or password "})
        setIsLoading(false)
        return
      }
      if (!response.ok) {
        setErrors({ general: "Something has gone wrong, try again" })
        setIsLoading(false)
        return
      }
      const data = await response.json()
      setIsLoading(false)
      onSuccess(data)
    } catch (err) {
      setErrors({ general: "Couldn't reach the server, retry man " + err })
      setIsLoading(false)
    }
  }

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isLoading,
    handleChange,
    handleSubmit,
  }
}
