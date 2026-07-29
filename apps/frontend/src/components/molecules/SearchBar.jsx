import { useState, useMemo } from "react"
import PropTypes from "prop-types"
import { Search, X } from "lucide-react"
import { Input, Card } from "../atoms"

//search bar molecule for help page

export default function SearchBar({
  placeholder,
  suggestions,
  onSelect,
  onSearch,
}) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    return suggestions
      .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6)
  }, [query, suggestions])

  const handleChange = (e) => {
    setQuery(e.target.value)
    onSearch?.(e.target.value)
  }

  const clear = () => {
    setQuery("")
    onSearch?.("")
  }

  const showDropdown = isFocused && filtered.length > 0

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          icon={Search}
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          className="h-14 text-OffBlack dark:text-OffWhite"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-OffBlack dark:text-OffWhite hover:text-OffBlack dark:hover:text-OffWhite transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <Card
          variant="glass"
          className="absolute z-20 mt-2 w-full !p-2 max-h-72 overflow-y-auto bg-OffWhite dark:bg-OffBlack border border-OffBlack dark:border-DarkGrey/20 shadow-2xl"
        >
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect?.(item)
                setQuery(item.label)
                setIsFocused(false)
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-OffBlack dark:text-OffWhite hover:bg-OffWhite/10 dark:hover:bg-OffWhite/10 transition-colors flex items-center justify-between group"
            >
              <span>{item.label}</span>
              <span className="text-[10px] uppercase tracking-wider text-OffBlack dark:text-DarkGrey group-hover:text-Red transition-colors">
                {item.category}
              </span>
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}

SearchBar.propTypes = {
  placeholder: PropTypes.string,
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      category: PropTypes.string,
    })
  ),
  onSelect: PropTypes.func,
  onSearch: PropTypes.func,
}

SearchBar.defaultProps = {
  placeholder: "Search for help...",
  suggestions: [],
  onSelect: undefined,
  onSearch: undefined,
}
