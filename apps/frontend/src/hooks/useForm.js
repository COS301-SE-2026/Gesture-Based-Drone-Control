import { useState } from "react"

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
    setTimeout(() => {
      setIsLoading(false)
      onSuccess()
    }, 1500)
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
