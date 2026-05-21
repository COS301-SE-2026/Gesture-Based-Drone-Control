import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock } from "lucide-react"
import Input from "../atoms/Input"
import darkbg from "../../assets/darkMode.png"
import validator from 'validator'

export default function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
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
    if (!formData.email) {
      newErr.email = "Email is required"
    }
    //valid email check
    else if (!validator.isEmail(formData.email)) {
      newErr.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErr.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErr.password = "Password needs to be at least 8 characters"
    }
    return newErr
  }

  //BEGIN-NOSCAN

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
      navigate("/dashboard")
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
            Welcome Back
          </h1>
          <p className="text-xl text-OffWhite drop-shadow-md max-w-md">
            Continue your Drone journey with Codex Merchants
          </p>
        </div>
      </div>

      {/* form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-OffBlack dark:text-OffWhite mb-2">
              Codex Merchants
            </h2>
            <p className="text-Grey dark:text-DarkGrey">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                placeHolder="you@example.com"
                icon={Mail}
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                errorMessage={errors.email}
              />
            </div>

            {/* password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2">
                Password
              </label>
              <Input
                id="password"
                name="password"
                placeHolder="Enter your password"
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                errorMessage={errors.password}
              />
            </div>

            {/* remember me and forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-Grey dark:border-DarkGrey accent-Red"
                />
                <span className="text-sm text-Grey dark:text-DarkGrey">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-Red hover:text-DarkRed transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-Red hover:bg-DarkRed disabled:bg-Grey text-OffWhite font-semibold py-2.5 rounded-lg transition-colors duration-200"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-Grey dark:text-DarkGrey">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-Red hover:text-DarkRed font-semibold transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-Grey/20 dark:border-DarkGrey/20">
            <p className="text-sm text-Grey dark:text-DarkGrey text-center">
              By signing in, you agree to our{" "}
              <Link to="/terms" className="text-Red hover:text-DarkRed">
                Terms & Conditions
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
  //END-NOSCAN
}
