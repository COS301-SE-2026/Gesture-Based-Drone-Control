import PropTypes from "prop-types"
import Input from "./Input"

const FormSection = ({
    lebel,
    name,
    type = "text",
    placeholder,
    icon,
    value,
    onChange,
    error,
    errorMessage,
    htmlFor,

}) => {
    return(
        <div>
            <label
            htmlFor ={htmlFor || name}
            className = "block text-sm font-medium text-OffBlack dark:text-OffWhite mb-2"
            >
                {label}
            </label>
            <Input
            type = {type}
            id = {htmlFor || name}
            name = {name}
            placeHolder={placeHolder}
            icon = {icon}
            value = { value}
            onChange= {onChange}
            error = {!!error}
            errorMessage = {errorMessage}
            />
        </div>
    )
}

FormSection.prpTypes = {
    label : PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    placeholder: PropTypes.string,
    icon:PropTypes.elementType,
    value:PropTypes.oneOfTypes([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func.isRequired,
    error: PropTypes.bool,
    errorMessages: PropTypes.string,
    htmlFor: PropTypes.string,
}

FormSection.defaultProps = {
    type:"text",
    placeholder: "",
    icon: null,
    error: false,
    errorMessage: "",
    htmlFor: "",
}

export default FormSection