import PropTypes from "prop-types"
import AuthPanel from "../atoms/AuthPanel"

const AuthLayout = ({ panelTitle, panelSubtitle, children }) => {
  return (
    <div className="flex min-h-screen bg-OffWhite dark:bg-OffBlack">
      <AuthPanel title={panelTitle} subtitle={panelSubtitle} />
      <div className="w-full lg:w-2/5 flex items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  )
}

AuthLayout.propTypes = {
  panelTitle: PropTypes.string.isRequired,
  panelSubtitle: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

export default AuthLayout
