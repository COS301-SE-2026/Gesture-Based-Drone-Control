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
    default: `
      text-white
      bg-[linear-gradient(145deg,var(--red),var(--red-deep))]
      hover:brightness-110
      active:bg-[linear-gradient(145deg,var(--red-deep),var(--red-shadow))]
      `,
    secondary: `
      text-ink
      bg-[linear-gradient(145deg,var(--red),var(--glass-2))]
      backdrop-blur-md
      backdrop-saturate-150
      border
      border-glassBrd
      hover:border-red
      active:border-redDeep
      `,
      
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
