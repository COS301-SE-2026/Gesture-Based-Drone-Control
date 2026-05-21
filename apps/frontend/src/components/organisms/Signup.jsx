import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, User, Calendar } from "lucide-react"
import Input from "../atoms/Input"
import darkbg from "../../assets/darkMode.png"

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
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

  const validateForm = () => {
    const newErr = {}
    if (!formData.firstName.trim()) {
      newErr.firstName = "First Name is required"
    }
    if (!formData.lastName.trim()) {
      newErr.lastName = "Last Name is required"
    }
    //valid email regex check
    if (!formData.email) {
      newErr.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErr.email = "Please enter a valid email"
    }
    if (!formData.dateOfBirth) {
      newErr.dateOfBirth = "Date of birth is required"
    }
    if (!formData.password) {
      newErr.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErr.password = "Password needs to be at least 8 characters"
    }

    if (!formData.confirmPassword) {
      newErr.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErr.confirmPassword = "Password do not match"
    }

    if (!formData.agreeToTerms) {
      newErr.agreeToTerms = "You must agree to continue"
    }

    return newErr
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErr = validateForm()

    if (Object.keys(newErr).length > 0) {
      setErrors(newErr)
      return
    }

    setIsLoading(true)
    //sim api call
    setTimeout(() => {
      setIsLoading(false)
      navigate("/login")
    }, 1500)
  }

  return (
    <div className="flex min-h-screen bg-OffWhite dark:bg-OffBlack">
      {/* panel */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url(${darkbg})`,
        }}
      >
        <div className="absolute inset-0 bg-OffBlack/40" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full text-center px-6">
          <h1 className="text-5xl font-bold text-OffWhite mb-4 drop-shadow-lg">
            Join Us
          </h1>
          <p className="text-xl text-OffWhite drop-shadow-md max-w-md">
            Start your adventure with Codex Merchants today
          </p>
        </div>
      </div>

      {/* form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md max-h-screen overflow-y-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-OffBlack dark:text-OffWhite mb-2">
              Codex Merchants
            </h2>
            <p className="text-Grey dark:text-DarkGrey">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* name */}
              <div>
                <label className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                  First Name
                </label>
                <Input
                  type="text"
                  name="firstName"
                  placeHolder="John"
                  icon={User}
                  value={formData.firstName}
                  onChange={handleChange}
                  error={!!errors.firstName}
                  errorMessage={errors.firstName}
                />
              </div>

              {/* surname */}
              <div>
                <label className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                  Last Name
                </label>
                <Input
                  type="text"
                  name="lastName"
                  placeHolder="Doe"
                  icon={User}
                  value={formData.lastName}
                  onChange={handleChange}
                  error={!!errors.lastName}
                  errorMessage={errors.lastName}
                />
              </div>

              {/* email */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  placeHolder="you@example.com"
                  icon={Mail}
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  errorMessage={errors.email}
                />
              </div>

              {/* DOB */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  icon={Calendar}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  error={!!errors.dateOfBirth}
                  errorMessage={errors.dateOfBirth}
                />
              </div>

              {/* password */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  name="password"
                  placeHolder="At least 8 characters"
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  errorMessage={errors.password}
                />
              </div>

              {/* confirm password */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeHolder="Confirm your password"
                  icon={Lock}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!errors.confirmPassword}
                  errorMessage={errors.confirmPassword}
                />
              </div>
            </div>

            {/* terms */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-Grey dark:border=DarkGrey accent-Red mt-0.5 flex-shrink-0"
                />
                <span className="text-sm text-Grey dark:text-DarkGrey">
                  I agree to the{" "}
                  <Link to="/terms" className="text-Red hover:text-DarkRed">
                    Terms & Conditions
                  </Link>
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="text-sm text-Red mt-1">{errors.agreeToTerms}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-Red hover:bg-DarkRed disabled:bg-Grey text-OffWhite font-semibold py-2.5 rounded-lg transition-colors duration-200"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-Grey dark:text-DarkGrey">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-Red hover:text-DarkRed font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
