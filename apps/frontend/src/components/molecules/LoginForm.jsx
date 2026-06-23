import{Link} from "react-router-dom"
import{Mail,Lock} from "lucide-react"
import FormSection from "../atoms/FormSection"
import validator from "validator"
import PropTypes from "prop-types"

const LoginForm = ({ forData, errors, islLoading,handleChange, handleSubmit }) => {
    const validateForm = () => {
        const newErr ={}
        if (!FormData.email){
            newErr.email = "Email is required"

        }
        else if (!validator.isEmail(FormData.email)){
            newErr.email = "Please enter a valid email"
        }

        if (!FormData.password){
            newErr.password = "Password is required"
        }
        else if (forData.password.length <8){
            newErr.password = "Password needs to be atleast 8 characters"
        }
        return newErr
    }

    return (
        <div className = "w-full max-w-sm">
            <div className = " mb-8 text-center">
                <h2 className = "text-3xl font-bold text-OffBlack dark:text-Offwhite mb-2">
                    Codex Merchants
                </h2>
                <p className = " text-Grey dark:text-DarkGrey">Sign in to your account</p>
            </div>
        <form
        onSubmit = {(e)=> handleSubmit(e,validateForm)}
        className = "space-y-5"
        >
            
            <FormSection
            label = "Email Address"
            name = "email"
            type = "email"
            placeHolder ="you@example.com"
            icon = {Mail}
            value = {FormData.email}
            onChange = {handleChange}
            error={errors.email}
            errorMessage={errors.email}
            />
        </form>
        </div>

    
        
        
    )
}