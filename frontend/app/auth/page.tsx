"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageTransition } from "@/components/page-transition"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react"

type AuthRole = "student" | "admin"

export default function AuthPage() {
  const router = useRouter()
  const { googleSignIn, adminLogin, isLoggedIn, isAdmin, user, isLoading: authLoading } = useAuth()

  const [role, setRole] = useState<AuthRole>("student")
  
  // Admin form state
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  useEffect(() => {
    if (isLoggedIn && !authLoading && user) {
      if (isAdmin) {
        router.push("/admin")
      } else {
        if (user.isFirstTimeLogin) {
          router.push("/onboarding")
        } else {
          router.push("/dashboard")
        }
      }
    }
  }, [isLoggedIn, isAdmin, user, authLoading, router])

  const handleGoogleSignIn = async () => {
    setMessage(null)
    setIsSubmitting(true)
    const result = await googleSignIn()
    setIsSubmitting(false)

    if (!result.success) {
      setMessage({ type: "error", text: result.error || "Failed to sign in with Google." })
    }
    // Success redirect handled by useEffect
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!adminEmail || !adminPassword) {
      setMessage({ type: "error", text: "Please enter admin email and password." })
      return
    }

    setIsSubmitting(true)
    const result = await adminLogin(adminEmail, adminPassword)
    setIsSubmitting(false)

    if (result.success) {
      router.push("/admin")
    } else {
      setMessage({ type: "error", text: result.error || "Invalid administrator credentials." })
    }
  }

  return (
    <PageTransition>
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black text-white p-4">
        {/* Background WebGL Shader */}
        <div className="absolute inset-0 z-0 opacity-40">
          <WebGLShader />
        </div>

        {/* Auth Card Container */}
        <div className="relative z-10 w-full max-w-md bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl transition-all duration-300 mx-2">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              CodeViit Platform
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {role === "student" ? "Student Access Portal" : "Administrator Portal"}
            </p>
          </div>

          {/* Role Selector Switch */}
          <div className="grid grid-cols-2 p-1 bg-zinc-900/80 border border-white/10 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole("student")
                setMessage(null)
              }}
              className={`py-2 text-sm font-medium rounded-lg transition-all ${
                role === "student"
                  ? "bg-blue-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Student Auth
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("admin")
                setMessage(null)
              }}
              className={`py-2 text-sm font-medium rounded-lg transition-all ${
                role === "admin"
                  ? "bg-purple-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Admin Portal
            </button>
          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm mb-4 border ${
                message.type === "success"
                  ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                  : message.type === "error"
                  ? "bg-red-950/60 border-red-500/50 text-red-300"
                  : "bg-blue-950/60 border-blue-500/50 text-blue-300"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* STUDENT FLOW */}
          {role === "student" && (
            <div className="space-y-4 pt-4">
               <div className="text-center text-sm text-zinc-400 mb-6">
                 Sign in securely with your Google account to access the arena.
               </div>
               <Button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <Spinner className="w-5 h-5 text-black" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path
                        d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.81498 8.87028 4.75 12.0003 4.75Z"
                        fill="#EA4335"
                      />
                      <path
                        d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.185 5.26537 14.295L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                        fill="#34A853"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ADMIN FLOW */}
          {role === "admin" && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="pl-9 bg-zinc-900/60 border-zinc-800 focus:border-purple-500 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="pl-9 bg-zinc-900/60 border-zinc-800 focus:border-purple-500 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/20"
              >
                {isSubmitting ? (
                  <Spinner className="w-5 h-5" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Admin Sign In
                  </span>
                )}
              </Button>
            </form>
          )}

        </div>
      </div>
    </PageTransition>
  )
}
