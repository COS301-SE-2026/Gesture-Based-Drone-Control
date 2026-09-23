import { useCallback, useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { RecognizerContext } from "./RecognizerContext"
import { fetchRecognizerMode, updateRecognizerMode } from "../lib/api"

/*
Which CV recognizer the backend is running, shared across the app

This is a provider rather than a plain hook because the mode decides which
input adapter useGestureControl has to connect, switching the recognizer in 
settings has to reach the gestures tab so it can reconnect, and with a local
hook each caller would hold its own copy and drift apart
*/

//backend is the authority, this is only what we show before the first fetch
const DEFAULT_AVAILABLE = ["rule", "ml", "motion"]

//motion reports gesture names the pose adapter has no mapping for, so the
//2 have to be connected together. Keep in step with the adapters
const MOTION_MODES = ["motion"]

export const RecognizerProivder = ({children}) => {
    const [mode, setMode] = useState(null)
    const [available, setAvailable] = useState(DEFAULT_AVAILABLE)
    const [pending, setPending] = useState(false)
    const [notice, setNotice] = useState(null)

    useEffect(() => {
        let cancelled = false

        fetchRecognizerMode()
            .then((data) => {
                if (cancelled) return
                setMode(data.mode)
                if (Array.isArray(data.available)) setAvailable(data.available)
            })
            .catch(() => {
                if (cancelled) return
                setMode("rule")
                setNotice("Could not reach backend")
            })

            return () => {
                cancelled = true
            }
    }, [])

    const switchMode = useCallback(async (next) => {
        setPending(true)
        setNotice(null)
        try {
            const data = await updateRecognizerMode(next)
            setMode(data.mode)
            if (data.mode !== data.requested) {
                setNotice("No trained model on server, staying on rules")
            } else if (data.warning) {
                setNotice(data.warning)
            }
        } catch {
            setNotice("Switch failed")
        } finally {
            setPending(false)
        }
    }, [])

    const value = useMemo(
        () => ({
            mode,
            available,
            pending,
            notice,
            switchMode,
            inputAdapter: MOTION_MODES.includes(mode) ? "motion" : "gesture",
        }),
        [mode, available, pending, notice, switchMode]
    )

    return (
        <RecognizerContext.Provider value={value}>
            {children}
        </RecognizerContext.Provider>
    )
}

RecognizerProivder.propTypes = {
    children: PropTypes.node.isRequired,
}