import PropTypes from "prop-types"
import { Radar } from "lucide-react"
import SearchBar from "./SearchBar"
import { Label } from "recharts"

//molecule that composes the searchbar molecule with a radar/telem signiture

export default function HelpTopBg({ suggestions, onSelect, onSearch }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-Grey dark:bg-OffBlack px-6 py-20 md:py-28">
      <div
        aria-hidden="true"
        className="block dark:hidden pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0, 0, 0, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        aria-hidden="true"
        className="hidden dark:block pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(225, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* radar sweep thing */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {[220, 360, 500].map((size) => (
          <div
            key={size}
            className="absolute rounded-lg border border-OffBlack/10 dark:border-OffWhite/10 "
            style={{
              width: size,
              height: size,
              left: -size / 2,
              top: -size / 2,
            }}
          />
        ))}
        <div
          className="motion-safe:animate-[spin_6s_linear_infinite] absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            left: -250,
            top: -250,
            background:
              "conic-gradient(from 0deg, rgba(233,55,55,0.35), transparent 25%)",
            maskImage: "radial-gradient(circle, black 60%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, black 60%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-OffBlack/15 dark:border-OffWhite/15 bg-OffBlack/5 dark:bg-OffWhite/5 px-3 py-1.5">
          <Radar className="w-5 h-5 text-Red motion-safe:animate-pulse" />
          <Label size="xs" className="text-DarkGrey">
            Support Center
          </Label>
        </span>

        <h1 className="text-4xl md:text-5xl font-bold text-OffBlack dark:text-OffWhite tracking-tight">
          How can we Help?
        </h1>
        <p className="text-OffBlack dark:text-OffWhite text-base md:text-lg max-w-xl">
          Search articles, browse user manual, or reach the support team for any
          questions to get you back in the air.
        </p>

        <SearchBar
          placeholder={'Search e.g "Drone not connecting to app"'}
          suggestions={suggestions}
          onSelect={onSelect}
          onSearch={onSearch}
        />
      </div>
    </section>
  )
}

HelpTopBg.propTypes = {
  suggestions: PropTypes.array,
  onSelect: PropTypes.func,
  onSearch: PropTypes.func,
}

HelpTopBg.defaultProps = {
  suggestions: [],
  onSelect: undefined,
  onSearch: undefined,
}
