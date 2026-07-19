export interface NavItem {
  label: string
  href: string
}

export interface SideLink {
  n: string
  t: string
  h: string
}

export const NAV_LINKS: NavItem[] = [
  { label: "Gestures", href: "#gestures" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Simulator", href: "#sim" },
  { label: "Download", href: "#download" },
  { label: "FAQ", href: "#faq" },
]

export const SIDE_LINKS: SideLink[] = [
  { n: "01", t: "Gestures", h: "#gestures" },
  { n: "02", t: "Pipeline", h: "#pipeline" },
  { n: "03", t: "System", h: "#system" },
  { n: "04", t: "Simulator", h: "#sim" },
  { n: "05", t: "Download", h: "#download" },
  { n: "06", t: "FAQ", h: "#faq" },
]
