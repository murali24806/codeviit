"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, FileCode2, Clock, Layers, Trophy, Calendar, ArrowRight, LogOut, CheckCircle2, User as UserIcon } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { ProblemCard } from "@/components/problem-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { useProblems } from "@/lib/problems-context"
import type { Contest } from "@/lib/types"

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "")

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoggedIn, logout } = useAuth()
  const { problems, isLoading: problemsLoading, loadProblems } = useProblems()

  const [contests, setContests] = useState<Contest[]>([])
  const [isContestsLoading, setIsContestsLoading] = useState(true)
  const [userStats, setUserStats] = useState<{
    totalPoints: number
    contestsAttemptedCount: number
    attemptedContestIds: string[]
    contestScores: Record<string, number>
    totalSubmissions: number
  }>({
    totalPoints: 0,
    contestsAttemptedCount: 0,
    attemptedContestIds: [],
    contestScores: {},
    totalSubmissions: 0
  })

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/auth")
      return
    }
    loadProblems()
    fetchContests()
    if (user) {
      fetchUserStats()
    }

    const onFocus = () => {
      fetchContests()
      if (user) fetchUserStats()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [isLoggedIn, user?.id, user?.email, router])

  const fetchUserStats = async () => {
    try {
      if (!user) return
      const params = new URLSearchParams()
      if (user.email) params.append("email", user.email)
      if (user.id) params.append("userId", user.id)
      if (user.registrationNumber) params.append("registrationNumber", user.registrationNumber)

      const res = await fetch(`${BACKEND_URL}/api/user/stats?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setUserStats({
          totalPoints: data.totalPoints || 0,
          contestsAttemptedCount: data.contestsAttemptedCount || 0,
          attemptedContestIds: data.attemptedContestIds || [],
          contestScores: data.contestScores || {},
          totalSubmissions: data.totalSubmissions || 0
        })
      }
    } catch (err) {
      console.error("Error loading user stats:", err)
    }
  }

  const fetchContests = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/contests`)
      if (res.ok) {
        const data = await res.json()
        setContests(data.contests || [])
      }
    } catch (err) {
      console.error("Error loading contests:", err)
    } finally {
      setIsContestsLoading(false)
    }
  }

  const handleNewProblem = () => {
    router.push("/editor")
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const getContestStatus = (contest: Contest) => {
    const now = new Date().getTime()
    const start = new Date(contest.startTime).getTime()
    const end = new Date(contest.endTime).getTime()

    if (now >= start && now <= end) {
      return { status: "live", label: "Live Contest", badgeClass: "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 animate-pulse" }
    }
    if (now < start) {
      return { status: "upcoming", label: "Upcoming", badgeClass: "bg-blue-950/80 border-blue-500/50 text-blue-300" }
    }
    return { status: "past", label: "Completed", badgeClass: "bg-zinc-800 border-zinc-700 text-zinc-400" }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-white/10 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs font-mono">
                  CV
                </div>
                <span className="text-lg font-bold text-white tracking-wide">CodeViit</span>
              </div>
              <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">{getGreeting()}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex flex-wrap items-center gap-2">
                {user?.name || "Student"}
                {user?.registrationNumber && (
                  <span className="text-xs sm:text-sm font-normal text-blue-400 bg-blue-950/60 border border-blue-800/50 px-2.5 py-0.5 rounded-full font-mono">
                    Reg: {user.registrationNumber}
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-950/40 rounded-xl text-xs sm:text-sm px-3 sm:px-4">
                    <Trophy className="w-4 h-4 mr-1.5 text-purple-400" /> Admin Portal
                  </Button>
                </Link>
              )}
              <Button
                onClick={() => {
                  logout()
                  router.push("/auth")
                }}
                variant="outline"
                className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl text-xs sm:text-sm px-3 sm:px-4"
              >
                <LogOut className="w-4 h-4 mr-1.5" /> Logout
              </Button>
            </div>
          </div>

          {/* STUDENT STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-gradient-to-br from-amber-950/40 to-yellow-950/20 border border-yellow-500/30 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-amber-950/20">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-yellow-300/80 uppercase font-semibold tracking-wider">Total Points</p>
                <h3 className="text-2xl font-black text-white mt-0.5">{userStats.totalPoints} <span className="text-sm font-normal text-yellow-400 font-mono">pts</span></h3>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-950/40 to-indigo-950/20 border border-blue-500/30 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-blue-950/20">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-blue-300/80 uppercase font-semibold tracking-wider">Contests Attempted</p>
                <h3 className="text-2xl font-black text-white mt-0.5">{userStats.contestsAttemptedCount} <span className="text-sm font-normal text-blue-400">contests</span></h3>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-950/40 to-zinc-900 border border-purple-500/30 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-purple-950/20">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <FileCode2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-purple-300/80 uppercase font-semibold tracking-wider">Submissions Sent</p>
                <h3 className="text-2xl font-black text-white mt-0.5">{userStats.totalSubmissions} <span className="text-sm font-normal text-zinc-400">attempts</span></h3>
              </div>
            </div>
          </div>

          {/* SECTION 1: CONTESTS ARENA */}
          <div className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" /> Contest Arena
                </h2>
                <p className="text-xs text-zinc-400 mt-1">LeetCode & CodeChef style competitive programming contests hosted for students.</p>
              </div>
            </div>

            {isContestsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Skeleton className="h-44 bg-white/5 rounded-2xl" />
                <Skeleton className="h-44 bg-white/5 rounded-2xl" />
              </div>
            ) : contests.length === 0 ? (
              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 text-center">
                <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-zinc-300">No Contests Available Right Now</h3>
                <p className="text-xs text-zinc-500 mt-1">Check back later when an admin schedules a contest!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contests.map((contest) => {
                  const { status, label, badgeClass } = getContestStatus(contest)
                  const isAttempted = userStats.attemptedContestIds.includes(contest.id)
                  const contestScore = userStats.contestScores[contest.id] || 0

                  return (
                    <div
                      key={contest.id}
                      className={`bg-zinc-900/60 border rounded-2xl p-5 sm:p-6 relative flex flex-col justify-between transition-all duration-300 group ${
                        isAttempted ? "border-emerald-500/40 bg-emerald-950/10" : "border-white/10 hover:border-blue-500/40"
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 mb-3">
                          <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                            {contest.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {isAttempted && (
                              <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Attempted ({contestScore} pts)
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${badgeClass}`}>
                              {label}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-400 mb-4 line-clamp-2">
                          {contest.description || "Compete in this coding challenge against fellow students."}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-black/40 p-3 rounded-xl border border-white/5 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Duration: {contest.durationMinutes || 60} mins</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                            <span>{contest.questions?.length || 0} Problems</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1.5 text-zinc-400 pt-1 border-t border-white/5">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            <span>
                              {new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(contest.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(contest.startTime).toLocaleDateString()})
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link href={`/contest/${contest.id}`}>
                        <Button
                          className={`w-full rounded-xl font-medium transition-all ${
                            status === "live"
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                              : status === "upcoming"
                              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          <span className="flex items-center justify-center gap-2">
                            {status === "live" ? "Enter Live Contest" : status === "upcoming" ? "View Contest Details" : "View Problems & Practice"}
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: PRACTICE CODE SANDBOX */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-zinc-400" /> Personal Practice Problems
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Your saved code snippets and test cases.</p>
              </div>

              <Button
                onClick={handleNewProblem}
                className="rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 px-4 py-2 text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Sandbox
              </Button>
            </div>

            {problemsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40 bg-white/5 rounded-2xl" />
                ))}
              </div>
            ) : problems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-900/30 border border-white/10 rounded-2xl">
                <FileCode2 className="w-10 h-10 text-zinc-600 mb-3" />
                <h3 className="text-base font-semibold text-zinc-300 mb-1">No Practice Problems Saved</h3>
                <p className="text-xs text-zinc-500 mb-4">Paste code from LeetCode or textbooks to practice independently.</p>
                <Button onClick={handleNewProblem} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Start Coding
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {problems.map((problem) => (
                  <ProblemCard key={problem.id} problem={problem} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  )
}
