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
            
        </div>
    )
}