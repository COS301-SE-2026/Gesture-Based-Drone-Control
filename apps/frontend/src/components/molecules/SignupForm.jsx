import { Link } from "react-router-dom"
import { Mail, Lock, User } from "lucide-react"
import FormSection from "../atoms/FormSection"
import PropTypes from "prop-types"

const SignupForm = ({
  formData,
  errors,
  isLoading,
  handleChange,
  handleSubmit,
}) => {
  return (
    <div className="w-full max-w-md max-h-screen overflow-y-auto">
      <div className="mb-8 text-center">
        <h2 className=" text-3xl font-bold text-OffBlack dark:text-OffWhite mb-2">
          Codex Merchants
        </h2>
        <p className="text-Grey dark:text-DarkGrey">create your account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general &&(
          <div className ="text-sm text-Red bg-Red/10 border border-Red/30 rounded-lg px-3 py-2">
            {errors.general}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <FormSection
            label="First Name"
            name="firstName"
            type="text"
            placeholder="John"
            icon={User}
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            errorMessage={errors.firstName}
          />
          <FormSection
            label="Last Name"
            name="lastName"
            type="text"
            placeholder="Cloe"
            icon={User}
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            errorMessage={errors.lastName}
          />
          <div className="col-span-2">
            <FormSection
              label="Email Address"
              name="email"
              type="email"
              placeholder="cloe@example.com"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              errorMessage={errors.email}
            />
          </div>

          <div className="col-span-2">
            <FormSection
              label="Password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              icon={Lock}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              errorMessage={errors.password}
            />
          </div>

          <div className="col-span-2">
            <FormSection
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              icon={Lock}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              errorMessage={errors.confirmPassword}
            />
          </div>
        </div>
        <div className="pt-2">
          <label
            htmlFor="agreeToTerms"
            className="flex items-start gap-3 cursor-pointer"
          >
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="w-4 h-4 rounded border-Grey dark:border-DarkGrey accent-Red mt-0.5 flex-shrink-0"
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
  )
}

SignupForm.propTypes = {
  formData: PropTypes.shape({
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    confirmPassword: PropTypes.string.isRequired,
    agreeToTerms: PropTypes.bool.isRequired,
  }).isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
}

export default SignupForm
