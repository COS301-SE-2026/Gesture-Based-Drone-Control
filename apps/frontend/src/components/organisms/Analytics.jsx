import { Clock, Gauge, Mountain } from "lucide-react"
import { Card } from "../atoms"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useTelemetry } from "@/hooks/useTelemetry"
import { useEffect, useRef, useState } from "react"

// const Analytics = () => {
//   // Mock flight data for charts
//   const flightTelemetryData = [
//     { time: "0min", value: 10 },
//     { time: "5min", value: 30 },
//     { time: "10min", value: 50 },
//     { time: "15min", value: 45 },
//     { time: "20min", value: 35 },
//     { time: "21min", value: 0 },
//   ]

//   const batteryHealthData = [
//     { time: "0min", health: 100 },
//     { time: "5min", health: 92 },
//     { time: "10min", health: 85 },
//     { time: "15min", health: 75 },
//     { time: "20min", health: 65 },
//     { time: "21min", health: 60 },
//   ]

//   const performanceData = [
//     { flight: "Flight 1", duration: 21 },
//     { flight: "Flight 2", duration: 18 },
//     { flight: "Flight 3", duration: 25 },
//     { flight: "Flight 4", duration: 19 },
//     { flight: "Flight 5", duration: 22 },
//     { flight: "Flight 6", duration: 20 },
//     { flight: "Flight 7", duration: 23 },
//     { flight: "Flight 8", duration: 21 },
//   ]

//   const metrics = {
//     flightTime: 21,
//     avgSpeed: 8.2,
//     maxAltitude: 53,
//     totalDistance: 3.5,
//     avgFlightDuration: 7,
//     totalFlights: 14,
//   }

const MAX_LIVE_POINTS = 60 //might change this depending
const MS_TO_KMH = 3.6
const API_BASE = "http://localhost:3001/api/analytics"

function fmt(value, digits = 0) {
  return typeof value === "number" ? value.toFixed(digits) : "--"
}

const Analytics = () => {
  const { telemetry } = useTelemetry()

  //live, in sess charts, built client side from websocket
  const [flightTelemetryData, setFlightTelemtryData] = useState([])
  const [batteryHealthData, setBatteryHealthData] = useState([])
  const startTimeRef = useRef(Date.now())
  const maxAltitudeRef = useRef(0)

  useEffect(() => {
    if (!telemetry) return

    const elapsedSec = (Date.now() - startTimeRef.current) / 1000
    const label = `${elapsedSec.toFixed(0)}s`

    if (typeof telemetry.altitude_m === "number") {
      maxAltitudeRef.current = Math.max(maxAltitudeRef.current, telemetry.altitude_m)
    } 

    setFlightTelemtryData((prev) => {
      const next = [...prev, { time: label, health: telemetry.battery_pct ?? 0}]
      return next.length > MAX_LIVE_POINTS ? next.slice(-MAX_LIVE_POINTS) : next
    })
  }, [telemetry])

  //history data from db via backend
  const [flights, setFlights] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const [flightsRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE}/flights?limit=7`),
          fetch(`${API_BASE}/summary`)
        ])

        if (!flightsRes.ok || !summaryRes.ok) {
          throw new Error("analytics endpoints returned a non 200 response :(")
        }

        const flightsData = await flightsRes.json()
        const summaryData = await summaryRes.json()

        if (!cancelled) {
          setFlights(flightsData)
          setSummary(summaryData)
          setLoadError("")
        }
      }
      catch (err) {
        console.error("analytics: failed to fetch flight history", err)
        if (!cancelled) setLoadError("could not load flight history from the server")
      }
    }

    fetchData()
    const intv = setInterval(fetchData, 5000)
    return () => {
      cancelled = true
      clearInterval(intv)
    }
  }, [])
}

  return (
    <div className="space-y-6">
      {/* top metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* flight time card */}
        <Card variant="glass">
          <div className="flex flex-col gap-3">
            <Clock className="w-6 h-6 text-Red" />
            <p className="text-xs text-OffBlack dark:text-DarkGrey uppercase">
              Flight time
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-OffBlack dark:text-OffWhite">
                {metrics.flightTime}
              </span>
              <span className="text-sm text-DarkGrey">mins</span>
            </div>
          </div>
        </Card>

        {/* avg speed */}
        <Card variant="glass">
          <div className="flex flex-col gap-3">
            <Gauge className="w-6 h-6 text-Red" />
            <p className="text-xs text-OffBlack dark:text-DarkGrey uppercase">
              Average speed
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-OffBlack dark:text-OffWhite">
                {metrics.avgSpeed}
              </span>
              <span className="text-sm text-DarkGrey">m/s</span>
            </div>
          </div>
        </Card>

        {/* max altitude */}
        <Card variant="glass">
          <div className="flex flex-col gap-3">
            <Mountain className="w-6 h-6 text-Red" />
            <p className="text-xs text-OffBlack dark:text-DarkGrey uppercase">
              Max Altitude
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-OffBlack dark:text-OffWhite">
                {metrics.maxAltitude}
              </span>
              <span className="text-sm text-DarkGrey">mins</span>
            </div>
          </div>
        </Card>
      </div>

      {/* the two charts go here */}
      <div className="grid grid-cols-2 gap-6">
        {/* flight telemetry */}
        <Card variant="glass">
          <div className="flex flex-col gap-4">
            <h3 className="text-md font-semibold text-OffBlack dark:text-OffWhite">
              Flight Telemetry
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={flightTelemetryData}>
                <CartesianGrid stroke="#D3D3D3" opacity={0.1} />
                <XAxis
                  dataKey="time"
                  stroke="#B1A7A6"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#B1A7A6" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#D3D3D3",
                    border: "1px solid #B1A7A6",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#A4161A"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* battery health */}
        <Card variant="glass">
          <div className="flex flex-col gap-4">
            <h3 className="text-md font-semibold text-OffBlack dark:text-OffWhite">
              Battery Health
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={batteryHealthData}>
                <CartesianGrid stroke="#D3D3D3" opacity={0.1} />
                <XAxis
                  dataKey="time"
                  stroke="#B1A7A6"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#B1A7A6" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#D3D3D3",
                    border: "1px solid #161A1D",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="health"
                  stroke="#A4161A"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* bar graph here */}
      <Card variant="glass">
        <div className="flex flex-col gap-4">
          <h3 className="text-md font-semibold text-OffBlack dark:text-OffWhite">
            Performance Metrics
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={performanceData}>
              <CartesianGrid stroke="#D3D3D3" opacity={0.1} />
              <XAxis
                dataKey="flight"
                stroke="#B1A7A6"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#B1A7A6" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#D3D3D3",
                  border: "1px solid #161A1D",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="duration" fill="#A4161A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* bottom stats part -> same as above */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total distance */}
        <Card variant="glass">
          <div className="text-center">
            <p className="text-xs text-OffBlack dark:text-DarkGrey uppercase">
              Total Distance
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-OffBlack dark:text-OffWhite">
                {metrics.totalDistance}
              </span>
              <span className="text-sm text-DarkGrey">km</span>
            </div>
          </div>
        </Card>

        {/* avg flight timee */}
        <Card variant="glass">
          <div className="text-center">
            <p className="text-xs text-OffBlack dark:text-DarkGrey uppercase">
              Average Flight Duration
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-OffBlack dark:text-OffWhite">
                {metrics.avgFlightDuration}
              </span>
              <span className="text-sm text-DarkGrey">mins</span>
            </div>
          </div>
        </Card>

        {/* total flights */}
        <Card variant="glass">
          <div className="text-center">
            <p className="text-xs text-OffBlack dark:text-DarkGrey uppercase">
              Total Flights
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-OffBlack dark:text-OffWhite">
                {metrics.totalFlights}
              </span>
              <span className="text-sm text-DarkGrey">flights</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Analytics
