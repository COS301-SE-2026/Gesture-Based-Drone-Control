import { Loader2 } from "lucide-react"
import PropTypes from "prop-types"

export default function Button({
  variant = "default",
  isLoading = false,
  icon: Icon = null,
  size = "md",
  className = "",
  disabled = false,
  onClick,
  children,
  ...props
}) {
  // size prop
  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  }

  //variants of the button prop
  const variantClasses = {
    default: "bg-Red text-OffWhite hover:bg-LightRed active:bg-DarkRed",
    secondary: "bg-DarkGrey text-OffBlack dark:text-OffWhite hover:bg-Grey active:bg-DarkGrey",
    //can add more if we need them
  }

  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />
    }
    if (Icon) {
      return <Icon className="w-4 h-4" />
    }
    return null
  }

  return (
    <button
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
                ${className}
                font-medium
                rounded-lg
                transition-colors
                duration-200
                flex
                items-center
                justify-center
                gap-5
            `}
      {...props}
    >
      {renderIcon()}
      {children}
    </button>
  )
}

Button.propTypes = {
  variant: PropTypes.oneOf(["default", "secondary"]),
  isLoading: PropTypes.bool,
  icon: PropTypes.elementType,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
}

Button.defaultProps = {
  variant: "default",
  isLoading: false,
  icon: null,
  size: "md",
  className: "",
  disabled: false,
  onClick: undefined,
  children: undefined,
}
