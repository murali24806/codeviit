"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageTransition } from "@/components/page-transition"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { ShieldCheck, Mail, User as UserIcon, Hash, Lock, KeyRound, ArrowRight, RefreshCw } from "lucide-react"

type AuthRole = "student" | "admin"

export default function AuthPage() {
  const router = useRouter()
  const { sendOtp, verifyOtp, adminLogin, isLoggedIn, isAdmin, isLoading: authLoading } = useAuth()

  const [role, setRole] = useState<AuthRole>("student")
  const [step, setStep] = useState<"details" | "otp">("details")
  
  // Student form state
  const [name, setName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      if (isAdmin) {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    }
  }, [isLoggedIn, isAdmin, authLoading, router])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!name.trim()) {
      setMessage({ type: "error", text: "Please enter your full name." })
      return
    }
    if (!registrationNumber.trim()) {
      setMessage({ type: "error", text: "Please enter your registration number." })
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: "error", text: "Please enter a valid email address." })
      return
    }

    setIsSubmitting(true)
    const result = await sendOtp(name, registrationNumber, email)
    setIsSubmitting(false)

    if (result.success) {
      setStep("otp")
      setMessage({
        type: "success",
        text: result.message || `Verification code sent to ${email}`
      })
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send OTP code." })
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!otpCode.trim() || otpCode.length < 6) {
      setMessage({ type: "error", text: "Please enter the 6-digit OTP sent to your email." })
      return
    }

    setIsSubmitting(true)
    const result = await verifyOtp(name, registrationNumber, email, otpCode)
    setIsSubmitting(false)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setMessage({ type: "error", text: result.error || "Invalid verification code." })
    }
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
              {role === "student" ? "Student Email & OTP Verification" : "Administrator Portal"}
            </p>
          </div>

          {/* Role Selector Switch */}
          <div className="grid grid-cols-2 p-1 bg-zinc-900/80 border border-white/10 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole("student")
                setStep("details")
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
            <>
              {step === "details" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Registration Number
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        type="text"
                        placeholder="2024CS101"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="pl-9 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Email Address (OTP Verification)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        type="email"
                        placeholder="student@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20"
                  >
                    {isSubmitting ? (
                      <Spinner className="w-5 h-5" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Send OTP via Email <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center text-xs text-zinc-400 mb-2">
                    Enter the 6-digit OTP code sent to <span className="text-blue-400 font-semibold">{email}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Enter Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="pl-9 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white text-center tracking-[0.4em] font-mono text-lg placeholder:tracking-normal placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <Spinner className="w-5 h-5" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Verify & Access Platform
                      </span>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="hover:text-white transition-colors"
                    >
                      ← Edit Student Info
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="flex items-center gap-1 text-blue-400 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </>
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
