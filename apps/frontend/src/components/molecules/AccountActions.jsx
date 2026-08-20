import { useNavigate } from "react-router-dom"
import { Button } from "../atoms"
import { API_BASE_URL } from "../../lib/api"

const AccountActions = () => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!response.ok) {
        console.warn("Logout request failed with status:", response.status)
      }
    } catch (err) {
      console.warn("Logout request could not reach the server:", err)
    } finally {
      navigate("/login")
    }
  }

  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-dim">
      <Button variant="secondary" onClick={() => navigate("/login")}>
        Switch Profile
      </Button>
      <Button onClick={handleLogout}>Logout</Button>
    </div>
  )
}

export default AccountActions
