import Card from "../atoms/Card"
import Label from "../atoms/Label"
import PropTypes from 'prop-types';

const CommandHistory = ({ commands = [], className = "" }) => {
  //made mock data here
  const defaultCommands = [
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe up - move up", timestamp: "18:50:43" },
    { action: "swipe down - move down", timestamp: "18:50:43" },
    { action: "swipe up - move up", timestamp: "18:50:42" },
  ]

  const displayCommands = commands.length > 0 ? commands : defaultCommands

  return (
    <Card variant="secondary" className={className}>
      <div className="flex flex-col gap-4">
        <Label size="md">Command History</Label>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {displayCommands.map((cmd, index) => (
            <div
              key={cmd.id || index}
              className="flex justify-between items-center text-sm border-b border-Grey/20 pb-2"
            >
              <span className="text-OffBlack/80">{cmd.action}</span>
              <span className="text-xs text-DarkGrey">{cmd.timestamp}</span>
            </div>
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
