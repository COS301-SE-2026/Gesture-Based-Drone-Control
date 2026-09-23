import{useEffect} from "react"
import PropTypes from "prop-types"
import {X} from "lucide-react"

export default function Modal({
    open, 
    onClose,
    title,
    children,
    className= "",
    size="md",
}){

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
            className="absolute inset-0 bg-black/60 backdrop-blur-lg"
            onClick={onClose}
            />

            <div 
            className={`relative w-full flex flex-col rounded-xl border border-glassBrd backdrop-saturate-150 shadow-glass-combo p-6 ${
                size =="full"
                ? "max-w-[96vw] h-[92vh]"
                :"max-w-lg"
            }${className}`}
            style={{
                background: "linear-gradient(145deg,color-mix(in srgb, var(--red-shadow)), color-mix(in srgb,var(--red-deep)))",
                backdropFilter: "blur(24px) saturate(160%)",
                WebkitBackdropFilter:"blur(24px) saturate(160%)",
            }}
            >
                <div className = "flex items-center justify-between pb-4 mb-4 border-b border-line">
                    {title && (
                    <h3 className="font-semibold text-ink text-lg tracking-wide">
                        {title}
                        </h3>
                        )}
                    <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="ml-auto flex items-center justify-center w-8 h-8 rounded-full text-dim hover:text-red hover:border-red border border-transparent transition-colors"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                </div>
                <div className="flex-1 min-h-0 flex flex-col" >{children}</div>
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
    size:PropTypes.oneOf(["md","full"]),
}

Modal.defaultProps = {
    open:false,
    onClose:undefined,
    title:"",
    children:undefined,
    className:"",
    size:"md",
}