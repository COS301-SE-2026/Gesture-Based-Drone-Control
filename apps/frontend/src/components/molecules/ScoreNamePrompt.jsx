/**
 * tiny little component that will prompt the user to enter their name once they die in one of the games
 * designed to dismiss itself after 5 seconds and be completely optional
 * 
 * Literally just a prompt to enter your name 
 */

import { useEffect, useState } from "react"
import { setScoreName } from "@/lib/leaderboard"

const AUTO_DISMISS_MS = 5000

export function ScoreNamePrompt({entryId, onDone}) {
    const [name, setName] = useState("")
    const [saving, setSaving] = useState(false)

    // auto get rid of the thing when timeout or enter 
    useEffect(() => {
        const t = setTimeout(onDone, AUTO_DISMISS_MS)
        return () => clearTimeout(t)
    }, [onDone])

    const submit = async (e) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
            onDone()
            return
        }
        setSaving(true)
        try {
            await setScoreName(entryId, trimmed)
        } catch {
            // eh its not that deep
        } finally {
            onDone()
        }
    }

    return (
        <form
            onSubmit={submit}
            className="absolute inset-x-0 bottom-4 mx-auto"
        >
            <input
                autoFocus
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && onDone()}
                placeholder="Enter your name: "
                className="bg-transparent text-white text-sm outline-none placeholder:text-white/40 w-64"
            />
            <button
                type="submit"
                disabled={saving}
                className="text-xs text-white/90"
            >
                Save
            </button>
            <button
                type="button"
                onClick={onDone}
                className="text-xs text-white/40"
            >
                Skip
            </button>
        </form>
    )
}