import Card from "../atoms/Card"
import Label from "../atoms/Label"
import PropTypes from "prop-types"
import { useState, useRef, useMemo } from "react"
import { ChevronDown } from "lucide-react"

const MAX_VISIBLE_COMMANDS = 8

const CommandHistory = ({
  commands = [],
  className = "",
  collapseRepeats = true,
}) => {
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
  ]

  const displayCommands = commands.length > 0 ? commands : mockCommands
  const visibleCommands = useMemo(() => {
    if (!collapseRepeats) {
      return displayCommands
        .slice(0, MAX_VISIBLE_COMMANDS)
        .map((cmd, index) => ({
          ...cmd,
          key: cmd.id ?? `${cmd.action}-${cmd.timestamp}-${index}`,
          count: 1,
        }))
    }

    const collapsed = displayCommands.reduce((acc, cmd, index) => {
      const previous = acc[acc.length - 1]

      if (previous && previous.action === cmd.action) {
        previous.count += 1
        return acc
      }

      acc.push({
        ...cmd,
        key: cmd.id ?? `${cmd.action}-${cmd.timestamp}-${index}`,
        count: 1,
      })
      return acc
    }, [])

    return collapsed.slice(0, MAX_VISIBLE_COMMANDS)
  }, [displayCommands, collapseRepeats])

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
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div ref={listRef} className="space-y-3 max-h-112 overflow-y-auto">
            {visibleCommands.length > 0 ? (
              visibleCommands.map((cmd, index) => (
                <Card
                  key={cmd.key}
                  variant="glass"
                  className="flex justify-between items-center text-sm border border-line px-3 py-2 animate-rise transition-all duration-200 hover:border-red hover:shadow-glass-hover hover:-translate-y-0.5"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-ink/80 truncate">{cmd.action}</span>
                    {cmd.count > 1 && (
                      <span
                        title={`repeated ${cmd.count} times`}
                        className="shrink-0 text-[0.65rem] px-1.5 py-0.5 rounded-full border border-line text-dim"
                      >
                        &times;{cmd.count}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-dim">
                    {cmd.timestamp}
                  </span>
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
      at: PropTypes.number,
      source: PropTypes.string,
    })
  ),
  className: PropTypes.string,
  collapseRepeats: PropTypes.bool,
}

CommandHistory.defaultProps = {
  commands: [],
  className: "",
  collapseRepeats: true,
}

export default CommandHistory
