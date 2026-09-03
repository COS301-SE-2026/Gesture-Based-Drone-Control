import { useCallback, useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { AuthContext } from "./AuthContext"
import { fetchCurrentUser } from "@/lib/api"

function toDisplayName(user) {
  if (!user) return undefined

  return user.first_name || user.email
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      setUser(await fetchCurrentUser())
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearUser = useCallback(() => setUser(null), [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      clearUser,
      displayName: toDisplayName(user),
    }),
    [user, loading, refreshUser, clearUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
