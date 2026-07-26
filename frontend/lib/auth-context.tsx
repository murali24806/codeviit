"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  isAdmin: boolean
  isLoading: boolean
  sendOtp: (name: string, registrationNumber: string, email: string) => Promise<{ success: boolean; message?: string; devMode?: boolean; error?: string }>
  verifyOtp: (name: string, registrationNumber: string, email: string, code: string) => Promise<{ success: boolean; error?: string }>
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check saved session in localStorage
    try {
      const stored = localStorage.getItem("runit_user_session")
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch (e) {
      console.error("Error reading stored auth session:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveUserSession = (userData: User) => {
    setUser(userData)
    try {
      localStorage.setItem("runit_user_session", JSON.stringify(userData))
    } catch (e) {
      console.error("Error storing auth session:", e)
    }
  }

  const sendOtp = async (name: string, registrationNumber: string, email: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, registrationNumber, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to send OTP" }
      }
      return { success: true, message: data.message, devMode: data.devMode }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error sending OTP" }
    }
  }

  const verifyOtp = async (name: string, registrationNumber: string, email: string, code: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, registrationNumber, email, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || "Verification failed" }
      }

      saveUserSession(data.user)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error verifying OTP" }
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

      saveUserSession(data.user)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error logging in as admin" }
    }
  }

  const logout = async () => {
    setUser(null)
    try {
      localStorage.removeItem("runit_user_session")
    } catch (e) {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isAdmin: user?.role === "admin",
        isLoading,
        sendOtp,
        verifyOtp,
        adminLogin,
        logout,
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
