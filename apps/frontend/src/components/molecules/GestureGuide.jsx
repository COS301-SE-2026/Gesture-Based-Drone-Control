import Card from "../atoms/Card"
import Label from "../atoms/Label"

const GestureGuide = ({ className = "" }) => {
  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4">
        <Label size="md">Gesture Guide</Label>

        <div className="space-y-4">
          {/* altitude section */}
          <div>
            <h3 className="text-sm font-semibold text-OffBlack dark:text-OffWhite mb-2">
              Altitude Keys
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-OffBlack/50 rounded text-OffWhite font-mono text-xs border border-Grey/30">
                    ↑
                  </kbd>
                  <span className="text-sm text-OffBlack/80 dark:text-OffWhite/80">
                    Up Arrow
                  </span>
                </div>
                <span className="text-xs text-OffBlack dark:text-Grey">
                  Increase Altitude
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-OffBlack/50 rounded text-OffWhite font-mono text-xs border border-Grey/30">
                    ↓
                  </kbd>
                  <span className="text-sm text-OffBlack/80 dark:text-OffWhite/80">
                    Down Arrow
                  </span>
                </div>
                <span className="text-xs text-OffBlack dark:text-Grey">
                  Decrease Altitude
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-OffBlack/50 rounded text-OffWhite font-mono text-xs border border-Grey/30">
                    ←
                  </kbd>
                  <kbd className="px-2 py-1 bg-OffBlack/50 rounded text-OffWhite font-mono text-xs border border-Grey/30">
                    →
                  </kbd>
                  <span className="text-sm text-OffBlack/80 dark:text-OffWhite/80">
                    Left/Right Arrows
                  </span>
                </div>
                <span className="text-xs text-OffBlack dark:text-Grey">
                  Move Laterally
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-Grey/20" />

          {/* rotation im actually not sure if we still need this */}
        </div>
      </div>
    </Card>
  )
}

export default GestureGuide
