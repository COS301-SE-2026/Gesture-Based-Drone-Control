import { useState } from "react"
import PropTypes from "prop-types"

export default function Toggle({
  checked = false,
  onChange = null,
  disabled = false,
  className = "",
  ...props
}) {
  const [isChecked, setIsChecked] = useState(checked)

  const handleChange = (e) => {
    const newVal = e.target.checked
    setIsChecked(newVal)
    if (onChange) {
      onChange(newVal)
    }
  }

  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />

      <div
        className={`
                    relative
                    inline-flex
                    h-6
                    w-11
                    items-center
                    rounded-full
                    transition-colors
                    duration-200
                    ${isChecked ? "bg-red" : "bg-dim"}
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
      >
        <span
          className={`
                        inline-block
                        h-4
                        w-4
                        transform
                        rounded-full
                        bg-white
                        transition-transform
                        duration-200
                        ${isChecked ? "translate-x-6" : "translate-x-1"}
                    `}
        />
      </div>
    </label>
  )
}

Toggle.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
}

Toggle.defaultProps = {
  checked: false,
  onChange: null,
  disabled: false,
  className: "",
}
