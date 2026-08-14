import PropTypes from "prop-types"

export default function Card({
  children,
  className = "",
  variant = "glass",
  clickable = false,
  onClick = null,
  ...props
}) {
  const variantClasses = {
    //light mode glass
    glass: `
        bg-[linear-gradient(145deg,var(--glass),var(--glass-2))]
        backdrop-blur-md
        backdrop-saturate-150
        border
        border-glassBrd
        shadow-glass-combo
        `,
    //dark mode glass
    dark: `
        bg-surface
        border
        border-line
        shadow-lg
        `,
  }

  const interactiveClasses = clickable
    ? `
    cursor-pointer
    transition-all
    duration-200
    hover:scale-105
    hover:border-red
    hover:scale-105
    hover:shadow-[var(--var-shadow),inset_0_1px_0_var(--glass-hi),0_0_24px_rgba(229,56,59,0.16)]
    `
    : ""

  if (clickable) {
    return (
      <button
        onClick={onClick}
        className={`
            ${variantClasses[variant]}
            ${interactiveClasses}
            rounded-xl
            p-md
            transition-colors
            duration-200
            w-full
            text-left
            ${className}
            `}
        {...props}
      >
        {children}
      </button>
    )
  }

  return (
    <div
      className={`
              ${variantClasses[variant]}
              ${interactiveClasses}
              rounded-xl
              p-md
              transition-colors
              duration-200
              ${className}
              `}
      {...props}
    >
      {children}
    </div>
  )
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(["glass", "dark"]),
  clickable: PropTypes.bool,
  onClick: PropTypes.func,
}

Card.defaultProps = {
  children: undefined,
  className: "",
  variant: "glass",
  clickable: false,
  onClick: null,
}
