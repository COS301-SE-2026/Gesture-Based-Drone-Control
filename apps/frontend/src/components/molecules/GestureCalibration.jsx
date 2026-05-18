import Card from "../atoms/Card";
import Label from "../atoms/Label";

const GestureCalibration = ({
    visibility = 80,
    confidence = 45,
    stability = 60,
    lighting = 'Good',
    background = 'Fair',
    className = ''
}) => {
    return (
        <Card variant="secondary" className={className}>
            <div className="flex flex-col gap-4">
                <Label size="md">Gesture Calibration</Label>

                <div className="space-y-4">
                    {/* metrics */}
                    <div className="space-y-3"> 
                        {/* visibility */}
                        <div> 
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-OffBlack/80">Visibility</span>
                                <span className="text-sm font-medium text-OffBlack">{visibility}%</span>
                            </div>
                            <div className="w-full bg-Grey/20 rounded-full h-2">
                                <div
                                    className="bg-Red rounded-full h-2 transition-all duration-300"
                                    style={{ width: `${visibility}%`}}
                                />
                            </div>
                        </div>

                        {/* confidence */}
                        <div> 
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-OffBlack/80">Confidence</span>
                                <span className="text-sm font-medium text-OffBlack">{confidence}%</span>
                            </div>
                            <div className="w-full bg-Grey/20 rounded-full h-2">
                                <div
                                    className="bg-yellow-500 rounded-full h-2 transition-all duration-300"
                                    style={{ width: `${confidence}%`}}
                                />
                            </div>
                        </div>

                        {/* stability */}
                        <div> 
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-OffBlack/80">Stability</span>
                                <span className="text-sm font-medium text-OffBlack">{stability}%</span>
                            </div>
                            <div className="w-full bg-Grey/20 rounded-full h-2">
                                <div
                                    className="bg-green-500 rounded-full h-2 transition-all duration-300"
                                    style={{ width: `${stability}%`}}
                                />
                            </div>
                        </div>
                    </div>

                    {/* divider */}
                    <div className="border-t border-Grey/20" />

                    {/* environment factors for camera */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-DarkGrey uppercase mb-1">Lighting</p>
                            <p className="text-sm font-medium text-OffBlack">{lighting}</p>
                        </div>
                        <div>
                            <p className="text-xs text-DarkGrey uppercase mb-1">Background</p>
                            <p className="text-sm font-medium text-OffBlack">{background}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default GestureCalibration;