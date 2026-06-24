import PropTypes from "prop-types"
import darkbg from "../../assets/darkMode.png"

const AuthPanel = ({title,subtitle}) => {
    return (
        <div
        className = "hidden lg:flex lg:w-3/5 bg-cover bg-center relative"
        style={{
            backgroundImage: `url(${darkbg})`,
        }}
        >
            <div className = "absolute inset-0 bg-OffBlack/40" />
            <div className = "relative z-10 flex flex-col justify-center items-center w-full text-center px-6">
                <h1 className = "text-5xl font-bold text-OffWhite mb-4 drop-shadow-lg">
                    {title}
                </h1>
                <p className = " text-xl text-OffWhite drop-shadow-md max-w-md">
                    {subtitle}
                </p>
            </div>
        </div>
    )

}

AuthPanel.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle:PropTypes.string.isRequired,
}

export default AuthPanel