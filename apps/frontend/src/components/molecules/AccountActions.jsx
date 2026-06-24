import{useNavigate} from "react-router-dom"
import {Button} from "../atoms"

const AccountActions = () => {
    const navigate = useNavigate()

    return  (
        <div className = "flex gap-2 mt-2 pt-2 border-t border-Grey/20">
            <Button variant ="secondary" onClick={() =>navigate ("/login")}>
                Switch Profile
            </Button>
            <Button onClick = {() => navigate ("/login")}>Logout</Button>
        </div>
    )
}

export default AccountActions