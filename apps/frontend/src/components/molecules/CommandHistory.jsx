import Card from "../atoms/Card"
import Label from "../atoms/Label"
import PropTypes from "prop-types"
import { useState, useRef } from "react"
import { ChevronDown } from "lucide-react"

const MAX_VISIBLE_COMMANDS = 8

const CommandHistory = ({ commands = [], className = "" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const listRef = useRef(null)

  const handleCardClick = (e) => {
    if (listRef.current?.contains(e.target)) {
      return
    }
    setIsOpen(!isOpen)
  }

  const mockCommands = [
    { id: 1, action: "swipe up - move up", timestamp: "12:34:56" },
    { id: 2, action: "swipe down - move down", timestamp: "12:35:20" },
    { id: 3, action: "swipe left - rotate left", timestamp: "12:36:10" },
  ]

  const displayCommands = commands.length > 0 ? commands : mockCommands
  const visibleCommands = displayCommands.slice(0, MAX_VISIBLE_COMMANDS)

  return (
    <Card
      variant="glass"
      className={`CommandHistory hover:!scale-100 hover:!bg-transparant hover:!shadow-xl ${className}`}
      clickable={true}
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-4 cursor-pointer">
        <div className="flex items-center justify-between w-full">
          <Label size="md">Command History</Label>

          <ChevronDown
            className={`w-5 h-5 text-ink transition-transform duration-300 ease-in-out ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </div>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div ref={listRef} className="space-y-3 max-h-112 overflow-y-auto">
            {visibleCommands.length > 0 ? (
              visibleCommands.map((cmd, index) => (
                <Card
                  key={cmd.id || index}
                  variant="glass"
                  className="flex justify-between items-center text-sm border border-line px-3 py-2 animate-rise transition-all duration-200 hover:border-red hover:shadow-glass-hover hover:-translate-y-0.5"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <span className="text-ink/80">{cmd.action}</span>
                  <span className="text-xs text-dim">{cmd.timestamp}</span>
                </Card>
              ))
            ) : (
              <p className="text-sm text-dim text-center py-4">
                No commands given yet
              </p>
            )}
          </div>
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
