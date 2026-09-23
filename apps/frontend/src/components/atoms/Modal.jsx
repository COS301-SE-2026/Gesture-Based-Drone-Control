import{useEffect} from "react"
import PropTypes from "prop-types"
import {X} from "lucide-react"

export default function Modal ({ open,onClose, title, children , className = ""}){
    useEffect(() => {
        if (!open) {
            return
        }

        const handleKey= (e) => {
            if (e.key === "Escape") onClose?.()
        }
        
        document.addEventListener("keydown", handleKey)
        return () => document.removeEventListener("keydown",handleKey)
    },[open,onClose])

    if(!open){
        return null 
    }

    return (
        <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        >
            <div
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            onClick={onClose}
            />

            <div 
            className={`relative w-full max-w-lg rounded-xl border border-glassBrd bg-[linear-gradient(145deg,var(--glass),var(--glass-2))] backdrop-blur-xl backdrop-saturate-150 shadow-glass-combo p-6 ${className}`}
            >
                <div className = "flex items-center justify-between mb-4">
                    {title && <h3 className="font-semibold text-ink">{title}</h3>}
                    <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="ml-auto flex items-center justify-center w-8 h-8 rounded-full text-dim hover:text-red hover:border-red border border-transparent transition-colors"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

Modal.propTypes= {
    open: PropTypes.bool,
    onClose:PropTypes.func,
    title:PropTypes.string,
    children:PropTypes.node,
    className:PropTypes.string,
}

Modal.defaultProps = {
    open:false,
    onClose:undefined,
    title:"",
    children:undefined,
    className:"",
}