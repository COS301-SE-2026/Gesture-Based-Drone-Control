/**
 * tiny little component that will prompt the user to enter their name once they die in one of the games
 * designed to dismiss itself after 5 seconds and be completely optional
 * 
 * Literally just a prompt to enter your name 
 */

import { useEffect, useState } from "react"
import { setScoreName } from "@/lib/leaderboard"

const AUTO_DISMISS_MS = 60000

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
            className="absolute inset-x-0 bottom-4 mx-auto w-fit flex items-center gap-2 bg-black/75 backdrop-blur px-3 py-2 rounded-md border border-white/10 z-50"
        >
            <input
                autoFocus
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && onDone()}
                placeholder="Enter your name: "
                className="bg-transparent text-white text-sm  placeholder:text-white/40 w-64"
            />
            <button
                type="submit"
                disabled={saving}
                className="text-xs text-white/90 hover:text-white px-2"
            >
                Save
            </button>
            <button
                type="button"
                onClick={onDone}
                className="text-xs text-white/40 hover:text-white/70 px-2"
            >
                Skip
            </button>
        </form>
    )
}