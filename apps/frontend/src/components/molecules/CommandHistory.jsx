import Card from "../atoms/Card"
import Label from "../atoms/Label"
import PropTypes from "prop-types"
import {useState} from "react"
import{ChevronDown,ChevronUp } from "lucide-react"

const CommandHistory = ({ commands = [], className = "" }) => {
  const[isOpen,setIsOpen] = useState(false)
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
    <Card 
    variant="glass" 
    className={`hover:scale-100 hover:bg-transperant dark:hover:bg-transperant hover:shadow-xl dark:hover:shadow-2xl ${className}`}
    clickable ={true}
    onClick={()=> setIsOpen(!isOpen)}
    >
      <div className="flex flex-col gap-4 cursor-pointer">        
        <div className ="flex items-center justify-between w-full">
        <Label size="md">Command History</Label>
          
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-OffBlack dark:text-OffWhite" />
          ) : (
            <ChevronDown className="w-5 h-5 text-OffBlack dark:text-OffWhite"/>
          )}
        </div>
        {isOpen && (
          <div
          className="space-y-3 max-h-112 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          >

          {displayCommands.map((cmd, index) => (
            <Card
              key={cmd.id || index}
              className="flex justify-between items-center text-sm border rounded border-Grey/20 pb-12"
            >
              <span className="text-OffBlack/80 dark:text-OffWhite">
                {cmd.action}
              </span>
              <span className="text-xs text-DarkGrey">{cmd.timestamp}</span>
            </Card>
          ))}
        </div>
        )}
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
