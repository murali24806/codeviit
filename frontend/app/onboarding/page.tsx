"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageTransition } from "@/components/page-transition"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { ArrowRight, BookOpen, Building, Hash, Layout } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoggedIn, isLoading, authFetch } = useAuth()

  const [registrationNumber, setRegistrationNumber] = useState("")
  const [branch, setBranch] = useState("")
  const [section, setSection] = useState("")
  const [collegeName, setCollegeName] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/auth")
    }
    if (user && !user.isFirstTimeLogin) {
       router.push("/dashboard")
    }
  }, [isLoggedIn, isLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!registrationNumber.trim() || !branch.trim() || !collegeName.trim()) {
      setMessage({ type: "error", text: "Please fill in all required fields." })
      return
    }

    setIsSubmitting(true)
    try {
      const getBackendUrl = () => {
        if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return ''
        return 'http://localhost:5000'
      }
      
      const res = await authFetch(`${getBackendUrl()}/api/user/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber,
          branch,
          section,
          collegeName
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save profile")
      
      // Update local storage session
      const stored = localStorage.getItem("runit_user_session")
      if (stored) {
        const u = JSON.parse(stored)
        const updated = { ...u, registrationNumber, branch, section, collegeName, isFirstTimeLogin: false }
        localStorage.setItem("runit_user_session", JSON.stringify(updated))
        // we can force reload to make context pick it up
        window.location.href = "/dashboard"
      } else {
        router.push("/dashboard")
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update profile." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !user) return <div className="min-h-screen bg-black flex items-center justify-center"><Spinner className="w-8 h-8 text-blue-500" /></div>

  return (
    <PageTransition>
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black text-white p-4">
        <div className="absolute inset-0 z-0 opacity-40">
          <WebGLShader />
        </div>

        <div className="relative z-10 w-full max-w-lg bg-black/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl transition-all duration-300 mx-2">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
              Welcome, <span className="text-blue-400">{user.name?.split(' ')[0]}</span>! 🎉
            </h1>
            <p className="text-sm text-zinc-400">
              Let's complete your profile to set up your CodeViit account.
            </p>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm mb-6 border ${
              message.type === "success" ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300" : "bg-red-950/60 border-red-500/50 text-red-300"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wide">
                Roll Number / Reg No. <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="e.g. 21CS101"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="pl-10 py-5 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-600 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wide">
                Branch / Department <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="pl-10 py-5 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-600 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wide">
                Section (Optional)
              </label>
              <div className="relative">
                <Layout className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="e.g. A"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="pl-10 py-5 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-600 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wide">
                College Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="e.g. National Institute of Technology"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="pl-10 py-5 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-600 rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl transition-all duration-200 shadow-xl shadow-blue-600/20 text-base mt-4"
            >
              {isSubmitting ? (
                <Spinner className="w-5 h-5" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Complete Profile & Enter Dashboard <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  )
}
