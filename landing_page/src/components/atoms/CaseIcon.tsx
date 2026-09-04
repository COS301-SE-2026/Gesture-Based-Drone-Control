import { ReactElement } from "react"

const PATHS: Record<string, ReactElement> = {
  account: (
    <>
      <circle cx="19" cy="17" r="7" />
      <path d="M 7 40 C 7 32 12 28 19 28 C 22.5 28 25.5 29 28 31" />
      <line x1="34" y1="30" x2="34" y2="42" />
      <line x1="28" y1="36" x2="40" y2="36" />
    </>
  ),
  signin: (
    <>
      <path d="M 15 18 V 14 A 9 9 0 0 1 33 14 V 18" />
      <rect x="10" y="18" width="28" height="22" rx="3" />
      <circle cx="24" cy="27" r="2.6" />
      <line x1="24" y1="29.5" x2="24" y2="34" />
    </>
  ),
  calibrate: (
    <>
      <path d="M 17 26 V 13 M 23 25 V 10 M 29 25 V 13 M 35 27 V 17" />
      <path d="M 11 27 V 22 A 3 3 0 0 1 17 22 V 30" />
      <path d="M 11 30 C 11 38 16 43 24 43 C 32 43 35 38 35 31" />
      <line x1="24" y1="4" x2="24" y2="9" />
      <line x1="40" y1="20" x2="44" y2="20" />
      <line x1="4" y1="20" x2="8" y2="20" />
    </>
  ),
  gesture: (
    <>
      <path d="M 14 27 V 15 A 3 3 0 0 1 20 15 V 25" />
      <path d="M 20 24 V 12 A 3 3 0 0 1 26 12 V 25" />
      <path d="M 26 25 V 16 A 3 3 0 0 1 32 16 V 30" />
      <path d="M 14 26 C 9 27 8 31 11 35 L 17 42 H 30 C 32 36 32 33 32 30" />
      <path d="M 37 12 A 12 12 0 0 1 37 32" strokeDasharray="3 4" />
    </>
  ),
  controller: (
    <>
      <path
        d="M 16 17 H 32 C 39 17 43 24 42 31 C 41.4 36 36.5 37 34 33.5 L 31 29 H 17 L 14 33.5 C 11.5 37
             6.6 36 6 31 C 5 24 9 17 16 17 Z"
      />
      <line x1="15" y1="22" x2="15" y2="28" />
      <line x1="12" y1="25" x2="18" y2="25" />
      <circle cx="32" cy="23" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="36" cy="26" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  telemetry: (
    <>
      <rect x="5" y="12" width="38" height="24" rx="3" />
      <path d="M 10 27 H 16 L 19 20 L 24 32 L 28 24 L 31 27 H 38" />
      <line x1="18" y1="41" x2="30" y2="41" />
      <line x1="24" y1="36" x2="24" y2="41" />
    </>
  ),
  simulator: (
    <>
      <rect x="5" y="9" width="38" height="26" rx="3" />
      <line x1="18" y1="42" x2="30" y2="42" />
      <line x1="24" y1="35" x2="24" y2="42" />
      <rect x="20" y="20" width="8" height="4" rx="1.6" />
      <line x1="20" y1="21" x2="14" y2="18" />
      <line x1="28" y1="21" x2="34" y2="18" />
      <ellipse cx="13" cy="17" rx="4" ry="1.5" />
      <ellipse cx="35" cy="17" rx="4" ry="1.5" />
    </>
  ),
  history: (
    <>
      <path d="M 6 38 V 10" />
      <path d="M 6 38 H 42" />
      <path d="M 11 32 L 19 24 L 26 29 L 39 14" />
      <circle cx="19" cy="24" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="26" cy="29" r="2.2" fill="currentColor" stroke="none" />
      <path d="M 33 14 H 39 V 20" />
    </>
  ),
}

export default function CaseIcon({ name }: Readonly<{ name: string }>) {
  return (
    <svg
      className="md-ucicon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}
