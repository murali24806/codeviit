"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageTransition } from "@/components/page-transition"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { ShieldCheck, Mail, Lock } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  // @ts-ignore
  const { adminLogin, isLoggedIn, isAdmin, authLoading } = useAuth()
  
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  useEffect(() => {
    if (isLoggedIn && !authLoading && isAdmin) {
      router.push("/admin")
    }
  }, [isLoggedIn, isAdmin, authLoading, router])

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
        <div className="relative z-10 w-full max-w-md bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl mx-2">
          
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              CodeViit Admin
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Administrator Portal
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm mb-4 border ${
                message.type === "error"
                  ? "bg-red-950/60 border-red-500/50 text-red-300"
                  : "bg-blue-950/60 border-blue-500/50 text-blue-300"
              }`}
            >
              {message.text}
            </div>
          )}

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

        </div>
      </div>
    </PageTransition>
  )
}
