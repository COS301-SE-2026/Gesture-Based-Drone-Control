import Card from '../atoms/Card';
import Label from '../atoms/Label';

//on the dashboard, shows a compass of the drones coords

const Compass = ({ heading = 0, className = '' }) => {
    return (
        <Card className={className}>
            <div className="w-full h-70 bg-OffWhite rounded-full  flex flex-col items-center justify-center gap-4">
                <Label size="md">Drone Orientation</Label>

                    {/* compass head/rose */}
                    <div className="relative w-48 h-48">
                        {/* outer circle of compass */}
                        <div className="absolute inset-0 rounded-full border-2 border-Grey"/>

                        {/* cardinal direction */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-full h-full">
                                <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-Red font-bold text-xl">N</span>
                                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 text-OffBlack font-bold text-xl">S</span>
                                <span className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 text-OffBlack font-bold text-xl">E</span>
                                <span className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-OffBlack font-bold text-xl">W</span>

                            </div>
                        </div>

                        {/* rotating needle */}
                        <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out"
                            style={{ transform: `rotate(${heading}deg)` }}
                        >
                            {/* needle */}
                            <div className="relative w-full h-full">
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-20 bg-Red rounded-full origin-bottom" />
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-20 bg-DarkGrey rounded-full origin-top" />

                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-OffBlack rounded-full" />

                            </div>
                        </div>
                    </div>

                    {/* heading */}
                    <div className="text-center">
                        <p className="text-3xl font-bold text-OffBlack font-mono">
                            {heading}°
                        </p>
                        <p className="text-sm text-OffBlack mt-1">
                            {getHeadingDirection(heading)}
                        </p>
                    </div>
                </div>
            
        </Card>
    );
};

//helper to get the direction
const getHeadingDirection = (heading) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(((heading % 360) / 22.5)) % 16;
    return directions[index];
};

export default Compass;