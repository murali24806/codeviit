"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "@/lib/types"
import { auth as firebaseAuth } from "@/lib/firebase"
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  isAdmin: boolean
  isLoading: boolean
  googleSignIn: () => Promise<{ success: boolean; user?: User; error?: string }>
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return ''
  }
  return 'http://localhost:5000'
}
export const BACKEND_URL = getBackendUrl()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isAdmin = false
    try {
      const storedUser = localStorage.getItem("runit_user_session")
      const storedToken = localStorage.getItem("runit_token")
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        if (parsed.role === "admin") isAdmin = true
      }
      if (storedToken) setToken(storedToken)
    } catch (e) {
      console.error("Error reading stored auth session:", e)
    } 

    if (isAdmin) {
      setIsLoading(false)
      return
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true)
          setToken(idToken)
          localStorage.setItem("runit_token", idToken)
        } catch (e) {}
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const saveUserSession = (userData: User, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    try {
      localStorage.setItem("runit_user_session", JSON.stringify(userData))
      localStorage.setItem("runit_token", userToken)
    } catch (e) {
      console.error("Error storing auth session:", e)
    }
  }

  const authFetch = async (url: string, options: RequestInit = {}) => {
    let currentToken = token
    
    // Auto-refresh Firebase token if student
    if (user && user.role !== 'admin' && firebaseAuth.currentUser) {
       currentToken = await firebaseAuth.currentUser.getIdToken()
       setToken(currentToken)
       localStorage.setItem("runit_token", currentToken)
    }

    const headers = new Headers(options.headers || {})
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`)
    }
    
    return fetch(url, { ...options, headers })
  }

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(firebaseAuth, provider)
      const idToken = await result.user.getIdToken()
      
      const res = await fetch(`${BACKEND_URL}/api/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken, name: result.user.displayName }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" }
      }

      saveUserSession(data.user, idToken)
      return { success: true, user: data.user }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error logging in" }
    }
  }

  const adminLogin = async (email: string, password: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || "Admin authentication failed" }
      }

      saveUserSession(data.user, data.token)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error logging in as admin" }
    }
  }

  const logout = async () => {
    setUser(null)
    setToken(null)
    try {
      await signOut(firebaseAuth)
    } catch(e) {}
    try {
      localStorage.removeItem("runit_user_session")
      localStorage.removeItem("runit_token")
    } catch (e) {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user,
        isAdmin: user?.role === "admin",
        isLoading,
        googleSignIn,
        adminLogin,
        logout,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
