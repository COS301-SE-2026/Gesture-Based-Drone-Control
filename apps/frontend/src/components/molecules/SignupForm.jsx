import {Link} from "react-router-dom"
import {Mail, Lock, User, Calender} from "lucide-react"
import FormSection from "../atoms/FormSection"
import validator from "validator"
import PropTypes from "prop-types"


const SignupForm = ({ formData,errors,isLoading,handleChange,handleSubmit})=> {
    const validateForm =() => {
        const newErr = {}
        if (!formData.firstName.trim()){
            newErr.firstName = " First Nmae is required"
        }

        if (!formData.lastName.trim()){
            newErr.lastName = "Lat name is required"
        }

        if(!formData.email){
            newErr.email="Email is required"
            
        }
        else if (!validator.isEmail(formData.email)){
            newErr.email ="Please enter a valid email"
        }

        if(!formData.dateOfBirth){
            newErr.dateOfBirth = " Date of birth is required"
        }
        if(!formData.password){
            newErr.password = "Password is required"
        }
        else if(formData.password.length<8){
            newErr.password ="Password needs to be atleast 8 characters"
        }

        if(!formData.confirmPassword){
            newErr.conformPassword = "Please confirm your password"
        }
        else if(formData.password !== formData.confirmPassword){
            newErr.confirmPassword = "Passwords do not match"
        }

        if(!formData.agreeToTerms ){
            newErr.agreeToTerms = "You must agree to continue"
        }
        return newErr


    }
    return(
        <div className = "w-full max-w-md max-h-screen overflow-y-auto">
            <div className = "mb-8 text-center">
                <h2 className = " text-3xl font-bold text-OffBlack dark:test-OffWhite mb-2">
                    Codex Merchants
                </h2>
                <p className ="text-Grey dark:text-DarkGrey">
                    create your account
                </p>
            </div>
            <form onSubmit ={handleSubmit } className = "space-y-4">
                <div className = "grid grid-cols-2 gap-3">
                    <FormSection
                    label = "First Name"
                    name = "firstName"
                    type = "text"
                    placeholder = "John"
                    icon = {User}
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                    errorMessage={errors.firstName}
                    />
                    <FormSection
                    label = "LastName"
                    name = "lastName"
                    type = "text"
                    placeholder = "Cloe"
                    icon = {User}
                    value={formData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                    errorMessage={errors.lastName}
                    />
                    <div className = "col-span-2">
                        <FormSection
                        label = "Email Address"
                        name = "email"
                        type = "email"
                        placeholder = "cloe@example.com"
                        icon = {Mail}
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        errorMessage={errors.email}
                        />
                    </div>

                    <div className = "col-span-2">
                        <FormSection
                        label = "Date of Birth"
                        name = "dateOfBirth"
                        type = "date"
                        icon={calender}
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        error={errors.dateOfBirth}
                        errorMessage={errors.dateOfBirth}
                        />
                    </div>

                    <div className = "col-span-2">
                        <FormSection
                        label = "Password"
                        name = "password"
                        type = "password"
                        placeholder ="At least 8 characters"
                        icon={Lock}
                        value={formData.password}
                        onChange={handleChange}
                        error={errors.password}
                        errorMessage={errors.password}
                        />
                    </div>

                    <div className = "col-span-2">
                        <FormSection
                        label = "Confirm Password"
                        name = "confirmPassword"
                        type = "password"
                        placeholder = "Confirm your password"
                        icon={Lock}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        error={errors.confirmPassword}
                        errorMessage={errors.confirmPassword}
                        />
                    </div>

                </div>
                <div className = "pt-2">
                    <label
                    htmlFor = "agreeToTerms"
                    className = "flex items-start gap-3 cursor-pointer">
                        <input
                        type = "checkbox"
                        name = "agreeToTerms"
                        checked = {formData.agreeToTerms}
                        onChange={handleChange}
                        className = "w-4 h-4 rounded border-Grey dark:border=DarkGrey accent-Red mt-0.5 flex-shrink-0"
                        />
                        
                    </label>
                </div>
            </form>
        </div>
    )
}