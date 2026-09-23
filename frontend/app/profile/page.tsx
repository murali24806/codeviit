"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Upload, User as UserIcon, BookOpen, Building, Hash, Layout, LogOut, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { PageTransition } from "@/components/page-transition"
import { useAuth, BACKEND_URL } from "@/lib/auth-context"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoggedIn, isLoading, authFetch, logout } = useAuth()

  const [name, setName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [branch, setBranch] = useState("")
  const [section, setSection] = useState("")
  const [collegeName, setCollegeName] = useState("")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("onboarding") === "true") {
        setIsOnboarding(true)
        setMessage({ type: "error", text: "Please complete your profile details to continue to the dashboard." })
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/auth")
      return
    }

    if (user) {
      setName(user.name || "")
      setRegistrationNumber(user.registrationNumber || "")
      setBranch(user.branch || "")
      setSection(user.section || "")
      setCollegeName(user.collegeName || "")
      setProfilePhotoUrl(user.profilePhotoUrl || "")
    }
  }, [user, isLoggedIn, isLoading, router])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size must be less than 5MB." })
      return
    }

    setIsUploading(true)
    setMessage(null)
    
    try {
      // Cloudinary unsigned upload
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "codeviit_preset") 
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      if (!cloudName) {
        throw new Error("Cloudinary cloud name is not configured in .env.local")
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Upload failed")

      setProfilePhotoUrl(data.secure_url)
      setIsUploading(false)
      setMessage({ type: "success", text: "Photo uploaded. Don't forget to save changes!" })
    } catch (err: any) {
      setIsUploading(false)
      setMessage({ type: "error", text: err.message || "Failed to upload photo." })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!registrationNumber.trim() || !branch.trim() || !collegeName.trim()) {
      setMessage({ type: "error", text: "Please fill in all required fields." })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await authFetch(`${BACKEND_URL}/api/user/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          registrationNumber,
          branch,
          section,
          collegeName,
          profilePhotoUrl
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")
      
      const stored = localStorage.getItem("runit_user_session")
      if (stored) {
        const u = JSON.parse(stored)
        const updated = { ...u, name, registrationNumber, branch, section, collegeName, profilePhotoUrl }
        localStorage.setItem("runit_user_session", JSON.stringify(updated))
      }
      
      if (isOnboarding) {
        router.push("/dashboard")
      } else {
        setMessage({ type: "success", text: "Profile updated successfully!" })
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
      <div className="min-h-screen bg-black text-white pb-12">
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {!isOnboarding && (
               <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors p-2" title="Back to Dashboard">
                 <ArrowLeft className="w-5 h-5" />
               </Link>
             )}
             <h1 className="text-lg font-bold">{isOnboarding ? "Welcome to CodeViit!" : "Profile Dashboard"}</h1>
          </div>
          <Button
            onClick={() => {
              logout()
            }}
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-full"
          >
            <LogOut className="w-4 h-4 mr-1.5" /> Logout
          </Button>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
          <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-10">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 overflow-hidden bg-zinc-800 flex items-center justify-center">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-zinc-500" />
                  )}
                </div>
                <label className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
                   {isUploading ? <Spinner className="w-6 h-6 text-white" /> : <><Upload className="w-6 h-6 text-white mb-1" /><span className="text-[10px] font-bold">CHANGE</span></>}
                   <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                </label>
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2 className="text-3xl font-extrabold text-white mb-1">{user.name}</h2>
                <p className="text-zinc-400 flex items-center justify-center sm:justify-start gap-2 text-sm mb-4">
                  {user.email} <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">{user.role}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm mb-8 border ${
                message.type === "success" ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300" : "bg-red-950/60 border-red-500/50 text-red-300"
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wide">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 py-5 bg-zinc-900/60 border-zinc-800 focus:border-blue-500 text-white placeholder:text-zinc-600 rounded-xl"
                      required
                    />
                  </div>
                </div>

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
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 px-8 rounded-xl transition-all duration-200 shadow-xl shadow-blue-600/20"
                >
                  {isSubmitting ? (
                    <Spinner className="w-5 h-5" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-5 h-5" /> Save Changes
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
