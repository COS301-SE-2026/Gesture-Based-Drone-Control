import Card from "../atoms/Card"
import Label from "../atoms/Label"
import PropTypes from "prop-types"

const CommandHistory = ({ commands = [], className = "" }) => {
  //made mock data here
  const defaultCommands = [
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe down - move down", timestamp: "18:50:43" },
    { action: "swipe up - move up", timestamp: "18:50:42" },
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe down - move down", timestamp: "18:50:43" },
    { action: "swipe up - move up", timestamp: "18:50:42" },
  ]

  const displayCommands = commands.length > 0 ? commands : defaultCommands

  return (
    <Card variant="glass" className={className}>
      <div className="flex flex-col gap-4">
        <Label size="md">Command History</Label>

        <div className="space-y-3 max-h-112 overflow-y-auto">
          {displayCommands.map((cmd, index) => (
            <Card
              key={cmd.id || index}
              className="flex justify-between items-center text-sm border rounded border-Grey/20 pb-12"
            >
              <span className="text-OffBlack/80 dark:text-OffWhite">{cmd.action}</span>
              <span className="text-xs text-DarkGrey">{cmd.timestamp}</span>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  )
}

CommandHistory.propTypes = {
  commands: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      action: PropTypes.string,
      timestamp: PropTypes.string,
    })
  ),
  className: PropTypes.string,
}

CommandHistory.defaultProps = {
  commands: [],
  className: "",
}

export default CommandHistory
