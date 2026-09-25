import { ShieldCheck } from "lucide-react"
import { Card } from "../atoms"

//GET BACK TO THIS LATER AFTER SEARCHING A BIT MORE
//idk if the SACAA Application requirements  should be kept in completely and not just the general ones....
const REQUIREMENTS = [
  "18 years of age or older with a valid legal ID",
  "Class 3(or Class 5 self declaration) Aviation Medical Certificate",
  "Restricted Radiotelephony Certificate",
  "English proficiency, spoken and written",
]

export default function LicenseOverview() {
  return (
    <Card variant="glass" className="flex flex-col gap-4 flex-1">
      <p className="text-dim">
        A Remote Pilot License (RPL) is the South African Civil Aviation
        Authority (SACAA) - issues qualification that lets you fly a drone
        commercially in South Africa. Its's issues once you have passed a theory
        exam covering air law, meteorology,navigation and flight
        principles,completed a practical skills test with an Approved Training
        Organization (ATO), and hold a valid aviation medical certificate and
        restricted radiotelephony certificate.
      </p>

      <div>
        <h4 className="text-ink mb-2"> Before you start, you will need</h4>
        <ul className="flex flex-col gap-1">
          {REQUIREMENTS.map((r) => (
            <li key={r} className="text-dim text-sm flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
