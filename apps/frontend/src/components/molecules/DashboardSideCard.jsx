import { Card, Button} from "../atoms";
import { UserCircle } from 'lucide-react'

export const DashboardSideCard = ({ userName = "User" }) => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <>
            <h2 className="text-lg font-bold text-OffBlack mb-2">Dashboard</h2>

            {/* welcome card */}
            
            <Card variant="glass">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <UserCircle size={30} className="text-OffBlack"/>
                        <span className="text-xs text-OffBlack">{formattedDate}</span>
                    </div>

                    <div className="mt-2">
                        <p className="text-sm text-OffBlack">Welcome back,</p>
                        <p className="text-lg text-OffBlack font-bold">{userName}</p>

                    </div>

                    <div className="flex gap-2 mt-2 pt-2 border-t border-Grey/20">
                        <Button variant="secondary">Switch Profile</Button>
                        <Button>Logout</Button>
                    </div>
                </div>
            </Card>
        </>
    );
};

export default DashboardSideCard;