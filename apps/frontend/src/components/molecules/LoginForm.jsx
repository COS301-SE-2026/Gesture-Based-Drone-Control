import { Link } from "react-router-dom"
import { Mail, Lock } from "lucide-react"
import FormSection from "../atoms/FormSection"
import validator from "validator"
import PropTypes from "prop-types"

const LoginForm = ({
  formData,
  errors,
  isLoading,
  handleChange,
  handleSubmit,
}) => {
  const validateForm = () => {
    const newErr = {}
    if (!formData.email) {
      newErr.email = "Email is required"
    } else if (!validator.isEmail(formData.email)) {
      newErr.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErr.password = "Password is required"
    } else if (
      !validator.isStrongPassword(formData.password, {
        minLength: 8,
        minLowerCase: 1,
        minUpperCase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      newErr.password =
        "The password must be atleast 8 characters long and must include an uppercase and lowercase letter,a number and a special character."
    }
    return newErr
  }

  return (
    <div className="w-full max-w-sm">
      <div className=" mb-8 text-center">
        <h2 className="text-3xl font-bold text-OffBlack dark:text-OffWhite mb-2">
          Codex Merchants
        </h2>
        <p className=" text-Grey dark:text-DarkGrey">Sign in to your account</p>
      </div>
      <form
        onSubmit={(e) => handleSubmit(e, validateForm)}
        className="space-y-5"
      >
        {errors.general && (
          <div className="text-sm text-Red bg-Red/10 border border-Red/30 rounded-lg px-3 py-2">
            {errors.general}
          </div>
        )}

        <FormSection
          label="Email Address"
          name="email"
          type="email"
          placeHolder="you@example.com"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          errorMessage={errors.email}
        />

        <FormSection
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          icon={Lock}
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          errorMessage={errors.password}
        />

        {/* the forget password thingies below btw Jaitin */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="w-4 h-4 rounded border-Grey dark:border-DarkGrey accent-Red"
            />
            <span className="text-sm text-Grey dark:text-DarkGrey">
              Remember Me
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
          {isLoading ? "Signing in ..." : "Sign In"}
        </button>
      </form>
      <div className="mt-6 text-center">
        <p className="text-sm text-Grey dark:text-DarkGrey">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className=" text-Red hover:text-DarkRed font-semibold transition-colors"
          >
            Sign Up
          </Link>
        </p>
      </div>
      <div className=" mt-8 pt-6 border-t border-Grey/20 dark:border-DarkGrey/20">
        <p className="text-sm text-Grey dark:text-DarkGrey text-center">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="text-Red hover:text-DarkRed">
            Terms & Conditions
          </Link>
        </p>
      </div>
    </div>
  )
}

LoginForm.propTypes = {
  formData: PropTypes.shape({
    email: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    rememberMe: PropTypes.bool.isRequired,
  }).isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
}

export default LoginForm
