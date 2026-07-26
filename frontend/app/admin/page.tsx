"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { PageTransition } from "@/components/page-transition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { Contest, ContestQuestion, TestCase, User, ContestSubmission } from "@/lib/types"
import { 
  Trophy, Plus, Trash2, Users, FileCode, Clock, Calendar, CheckCircle2, 
  XCircle, LogOut, Eye, Code, Layers, Search, Sparkles, Download 
} from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function AdminPage() {
  const router = useRouter()
  const { user, isAdmin, logout } = useAuth()

  const [activeTab, setActiveTab] = useState<"contests" | "create" | "users" | "submissions">("contests")

  // Data states
  const [contests, setContests] = useState<Contest[]>([])
  const [usersList, setUsersList] = useState<User[]>([])
  const [submissions, setSubmissions] = useState<ContestSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Submissions search filter & Modal
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubmission, setSelectedSubmission] = useState<ContestSubmission | null>(null)

  // Create Contest Form State
  const [contestTitle, setContestTitle] = useState("")
  const [contestDescription, setContestDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)

  // Questions State
  const [questions, setQuestions] = useState<ContestQuestion[]>([
    {
      id: "q_1",
      title: "Two Sum",
      description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
      inputFormat: "First line contains N and Target. Second line contains N space-separated integers.",
      outputFormat: "Print two space-separated indices.",
      constraints: "2 <= N <= 10^4",
      testCases: [
        { id: "tc_1", input: "4 9\n2 7 11 15", expectedOutput: "0 1", description: "Sample Case 1" },
        { id: "tc_2", input: "3 6\n3 2 4", expectedOutput: "1 2", description: "Sample Case 2" }
      ]
    }
  ])

  const [isSaving, setIsSaving] = useState(false)
  const [bannerAlert, setBannerAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      router.push("/auth")
      return
    }
    fetchData()
  }, [isAdmin, router])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [contestsRes, usersRes, subsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/contests`),
        fetch(`${BACKEND_URL}/api/admin/users`),
        fetch(`${BACKEND_URL}/api/admin/submissions`)
      ])

      if (contestsRes.ok) {
        const data = await contestsRes.json()
        setContests(data.contests || [])
      }

      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsersList(data.users || [])
      }

      if (subsRes.ok) {
        const data = await subsRes.json()
        setSubmissions(data.submissions || [])
      }
    } catch (err) {
      console.error("Error fetching admin data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Question Manipulation
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        title: `Problem ${questions.length + 1}`,
        description: "",
        inputFormat: "",
        outputFormat: "",
        constraints: "",
        testCases: [{ id: `tc_${Date.now()}`, input: "", expectedOutput: "" }]
      }
    ])
  }

  const removeQuestion = (qIndex: number) => {
    if (questions.length === 1) return
    setQuestions(questions.filter((_, idx) => idx !== qIndex))
  }

  const updateQuestion = (qIndex: number, field: keyof ContestQuestion, value: any) => {
    const updated = [...questions]
    updated[qIndex] = { ...updated[qIndex], [field]: value }
    setQuestions(updated)
  }

  // Handle TestCase Manipulation
  const addTestCase = (qIndex: number) => {
    const updated = [...questions]
    updated[qIndex].testCases.push({
      id: `tc_${Date.now()}`,
      input: "",
      expectedOutput: "",
      description: ""
    })
    setQuestions(updated)
  }

  const removeTestCase = (qIndex: number, tcIndex: number) => {
    const updated = [...questions]
    if (updated[qIndex].testCases.length === 1) return
    updated[qIndex].testCases = updated[qIndex].testCases.filter((_, idx) => idx !== tcIndex)
    setQuestions(updated)
  }

  const updateTestCase = (qIndex: number, tcIndex: number, field: keyof TestCase, value: string) => {
    const updated = [...questions]
    updated[qIndex].testCases[tcIndex] = {
      ...updated[qIndex].testCases[tcIndex],
      [field]: value
    }
    setQuestions(updated)
  }

  // Handle Contest Submission to Backend
  const handlePublishContest = async (e: React.FormEvent) => {
    e.preventDefault()
    setBannerAlert(null)

    if (!contestTitle.trim()) {
      setBannerAlert({ type: "error", message: "Contest title is required." })
      return
    }
    if (!startTime || !endTime) {
      setBannerAlert({ type: "error", message: "Please specify start time and end time." })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/contests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: contestTitle,
          description: contestDescription,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          durationMinutes,
          questions
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to publish contest")

      setBannerAlert({ type: "success", message: "Contest created and published successfully!" })
      setContestTitle("")
      setContestDescription("")
      fetchData()
      setActiveTab("contests")
    } catch (err: any) {
      setBannerAlert({ type: "error", message: err.message || "Failed to create contest." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteContest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contest?")) return
    try {
      await fetch(`${BACKEND_URL}/api/contests/${id}`, { method: "DELETE" })
      fetchData()
    } catch (err) {
      console.error("Error deleting contest:", err)
    }
  }

  const filteredSubmissions = submissions.filter((s) => {
    const query = searchQuery.toLowerCase()
    return (
      s.userName?.toLowerCase().includes(query) ||
      s.registrationNumber?.toLowerCase().includes(query) ||
      s.contestTitle?.toLowerCase().includes(query) ||
      s.questionTitle?.toLowerCase().includes(query)
    )
  })

  const handleExportSubmissionsCSV = (targetContestId?: string) => {
    const listToExport = targetContestId 
      ? submissions.filter(s => s.contestId === targetContestId)
      : filteredSubmissions

    if (listToExport.length === 0) {
      alert("No submission data available to export.")
      return
    }

    const headers = [
      "Submission ID",
      "Student Name",
      "Registration Number",
      "Email",
      "Contest Title",
      "Question Title",
      "Language",
      "Status",
      "Score (%)",
      "Passed Cases",
      "Total Cases",
      "Submitted At"
    ]

    const rows = listToExport.map(s => [
      `"${s.id}"`,
      `"${s.userName || ''}"`,
      `"${s.registrationNumber || ''}"`,
      `"${s.email || ''}"`,
      `"${s.contestTitle || ''}"`,
      `"${s.questionTitle || ''}"`,
      `"${s.language || ''}"`,
      `"${s.status || ''}"`,
      s.score ?? 0,
      s.passedCount ?? 0,
      s.totalCount ?? 0,
      `"${new Date(s.submittedAt).toLocaleString()}"`
    ])

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const dateStr = new Date().toISOString().slice(0, 10)
    link.href = url
    link.setAttribute("download", targetContestId ? `Contest_Submissions_${targetContestId}_${dateStr}.csv` : `CodeViit_All_Submissions_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportStudentsCSV = () => {
    if (usersList.length === 0) {
      alert("No student data available to export.")
      return
    }

    const headers = [
      "Student Name",
      "Registration Number",
      "Email",
      "Role",
      "Total Points",
      "Contests Attempted",
      "Submissions Count",
      "Joined Date"
    ]

    const rows = usersList.map(u => [
      `"${u.name || ''}"`,
      `"${u.registrationNumber || ''}"`,
      `"${u.email || ''}"`,
      `"${u.role || 'student'}"`,
      u.totalPoints ?? 0,
      u.contestsAttempted ?? 0,
      u.submissionsCount ?? 0,
      `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}"`
    ])

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const dateStr = new Date().toISOString().slice(0, 10)
    link.href = url
    link.setAttribute("download", `CodeViit_Registered_Students_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white">
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              CodeViit Admin Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Logged in as <strong className="text-white">{user?.name}</strong>
            </span>
            <Button
              onClick={() => {
                logout()
                router.push("/auth")
              }}
              variant="outline"
              size="sm"
              className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full"
            >
              <LogOut className="w-4 h-4 mr-1.5" /> Logout
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-4 mb-8 text-nowrap max-w-full">
            <button
              onClick={() => setActiveTab("contests")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === "contests"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Trophy className="w-4 h-4" /> Available Contests ({contests.length})
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === "create"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Plus className="w-4 h-4" /> Create New Contest
            </button>

            <button
              onClick={() => setActiveTab("submissions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === "submissions"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <FileCode className="w-4 h-4" /> Submissions & Live Monitor ({submissions.length})
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === "users"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Users className="w-4 h-4" /> Student Registrations ({usersList.length})
            </button>
          </div>

          {/* TAB 1: CONTESTS LIST */}
          {activeTab === "contests" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Hosted Contests</h2>
                <Button
                  onClick={() => setActiveTab("create")}
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" /> Host Contest
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-purple-400" /></div>
              ) : contests.length === 0 ? (
                <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                  <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-zinc-300">No Contests Hosted Yet</h3>
                  <p className="text-sm text-zinc-500 mb-4">Create your first LeetCode / CodeChef style programming contest.</p>
                  <Button onClick={() => setActiveTab("create")} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
                    Create Contest
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contests.map((c) => (
                    <div key={c.id} className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 relative hover:border-purple-500/50 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{c.title}</h3>
                          <p className="text-xs text-zinc-400 line-clamp-2">{c.description || "No description provided."}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteContest(c.id)}
                          className="p-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Delete Contest"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-white/5 p-3 rounded-xl mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          <span>Start: {new Date(c.startTime).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>End: {new Date(c.endTime).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" /> {c.questions?.length || 0} Questions
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleExportSubmissionsCSV(c.id)}
                            className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                            title="Export CSV for this contest"
                          >
                            <Download className="w-3.5 h-3.5" /> Export CSV
                          </button>
                          <Link
                            href={`/contest/${c.id}`}
                            className="text-purple-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            Preview Arena <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE CONTEST FORM */}
          {activeTab === "create" && (
            <form onSubmit={handlePublishContest} className="space-y-8 max-w-4xl">
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-400" /> Contest Details
                </h2>

                {bannerAlert && (
                  <div className={`p-3 rounded-xl text-sm border ${
                    bannerAlert.type === "success" ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300" : "bg-red-950/60 border-red-500/50 text-red-300"
                  }`}>
                    {bannerAlert.message}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Contest Title</label>
                  <Input
                    type="text"
                    placeholder="Weekly Coding Contest #1"
                    value={contestTitle}
                    onChange={(e) => setContestTitle(e.target.value)}
                    className="bg-black/60 border-zinc-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Contest Rules & Description</label>
                  <Textarea
                    placeholder="Instructions, grading criteria, and rules for participants..."
                    value={contestDescription}
                    onChange={(e) => setContestDescription(e.target.value)}
                    rows={3}
                    className="bg-black/60 border-zinc-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Start Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-black/60 border-zinc-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">End Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-black/60 border-zinc-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Duration (Minutes)</label>
                    <Input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="bg-black/60 border-zinc-800 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* QUESTIONS CREATOR */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" /> Contest Questions ({questions.length})
                  </h2>
                  <Button type="button" onClick={addQuestion} variant="outline" size="sm" className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40">
                    <Plus className="w-4 h-4 mr-1" /> Add Another Problem
                  </Button>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={q.id} className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="font-semibold text-purple-400 text-sm">Problem #{qIdx + 1}</span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="text-red-400 text-xs hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Problem
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">Problem Title</label>
                        <Input
                          type="text"
                          placeholder="e.g. Reverse Linked List"
                          value={q.title}
                          onChange={(e) => updateQuestion(qIdx, "title", e.target.value)}
                          className="bg-black/60 border-zinc-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">Constraints</label>
                        <Input
                          type="text"
                          placeholder="e.g. 1 <= N <= 10^5"
                          value={q.constraints}
                          onChange={(e) => updateQuestion(qIdx, "constraints", e.target.value)}
                          className="bg-black/60 border-zinc-800 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Problem Description</label>
                      <Textarea
                        placeholder="Detailed problem statement like LeetCode..."
                        value={q.description}
                        onChange={(e) => updateQuestion(qIdx, "description", e.target.value)}
                        rows={3}
                        className="bg-black/60 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">Input Format</label>
                        <Input
                          type="text"
                          placeholder="Standard stdin input details"
                          value={q.inputFormat}
                          onChange={(e) => updateQuestion(qIdx, "inputFormat", e.target.value)}
                          className="bg-black/60 border-zinc-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">Output Format</label>
                        <Input
                          type="text"
                          placeholder="Expected stdout output details"
                          value={q.outputFormat}
                          onChange={(e) => updateQuestion(qIdx, "outputFormat", e.target.value)}
                          className="bg-black/60 border-zinc-800 text-white"
                        />
                      </div>
                    </div>

                    {/* TEST CASES */}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-semibold text-zinc-300">Test Cases ({q.testCases.length})</label>
                        <button
                          type="button"
                          onClick={() => addTestCase(qIdx)}
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Test Case
                        </button>
                      </div>

                      <div className="space-y-3">
                        {q.testCases.map((tc, tcIdx) => (
                          <div key={tc.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                            <div className="sm:col-span-5">
                              <Input
                                placeholder="Input (stdin)"
                                value={tc.input}
                                onChange={(e) => updateTestCase(qIdx, tcIdx, "input", e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-xs text-white"
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <Input
                                placeholder="Expected Output (stdout)"
                                value={tc.expectedOutput}
                                onChange={(e) => updateTestCase(qIdx, tcIdx, "expectedOutput", e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-xs text-white"
                              />
                            </div>
                            <div className="sm:col-span-2 flex justify-end">
                              {q.testCases.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTestCase(qIdx, tcIdx)}
                                  className="text-red-400 p-1 hover:bg-red-950/40 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-purple-600/20 text-base"
              >
                {isSaving ? <Spinner className="w-5 h-5" /> : "Publish Contest to Dashboard"}
              </Button>
            </form>
          )}

          {/* TAB 3: SUBMISSIONS & LIVE MONITOR */}
          {activeTab === "submissions" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Contest Submissions & Code Monitoring</h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="Search student, reg no, contest..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-zinc-900/60 border-zinc-800 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => handleExportSubmissionsCSV()}
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/40 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0"
                  >
                    <Download className="w-4 h-4 text-emerald-400" /> Export CSV
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-purple-400" /></div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                  <FileCode className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-zinc-300">No Submissions Recorded</h3>
                  <p className="text-sm text-zinc-500">Student contest code submissions will appear here live.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-zinc-900/60 border border-white/10 rounded-2xl">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-black/60 text-xs uppercase text-zinc-400 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Reg Number</th>
                        <th className="px-6 py-4">Contest & Problem</th>
                        <th className="px-6 py-4">Status & Score</th>
                        <th className="px-6 py-4">Submitted At</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">{sub.userName}</td>
                          <td className="px-6 py-4 text-xs font-mono text-zinc-400">{sub.registrationNumber}</td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-semibold text-purple-400">{sub.contestTitle}</div>
                            <div className="text-xs text-zinc-400">{sub.questionTitle}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              sub.status === "Accepted"
                                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                                : "bg-red-950/60 border-red-500/50 text-red-300"
                            }`}>
                              {sub.status === "Accepted" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {sub.status} ({sub.score}%)
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-400">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              onClick={() => setSelectedSubmission(sub)}
                              size="sm"
                              variant="outline"
                              className="border-purple-500/40 text-purple-300 hover:bg-purple-950/40 rounded-lg text-xs"
                            >
                              <Code className="w-3.5 h-3.5 mr-1" /> View Code
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: USERS LIST */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Registered Students</h2>
                <Button
                  onClick={handleExportStudentsCSV}
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/40 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" /> Export Students CSV
                </Button>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-purple-400" /></div>
              ) : usersList.length === 0 ? (
                <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                  <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-zinc-300">No Students Registered Yet</h3>
                </div>
              ) : (
                <div className="overflow-x-auto bg-zinc-900/60 border border-white/10 rounded-2xl">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-black/60 text-xs uppercase text-zinc-400 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Registration Number</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Total Points</th>
                        <th className="px-6 py-4">Attempted</th>
                        <th className="px-6 py-4">Submissions</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {usersList.map((u, idx) => (
                        <tr key={u.id ? `${u.id}_${u.email || idx}` : idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">{u.name}</td>
                          <td className="px-6 py-4 text-xs font-mono text-zinc-400">{u.registrationNumber || "N/A"}</td>
                          <td className="px-6 py-4 text-zinc-300">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-yellow-300 border border-yellow-500/40">
                              🏆 {u.totalPoints || 0} pts
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-blue-300 font-semibold">
                            {u.contestsAttempted || 0} contests
                          </td>
                          <td className="px-6 py-4 text-xs text-purple-300 font-mono">
                            {u.submissionsCount || 0}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold ${
                              u.role === "admin" ? "bg-purple-950 text-purple-300 border border-purple-800" : "bg-blue-950 text-blue-300 border border-blue-800"
                            }`}>
                              {u.role || "student"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-400">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Recent"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* VIEW CODE MODAL */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedSubmission.userName} ({selectedSubmission.registrationNumber})</h3>
                  <p className="text-xs text-purple-400">{selectedSubmission.contestTitle} — {selectedSubmission.questionTitle}</p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-300 bg-white/5 p-3 rounded-xl">
                <div>Language: <strong className="text-white uppercase">{selectedSubmission.language}</strong></div>
                <div>Status: <strong className={selectedSubmission.status === "Accepted" ? "text-emerald-400" : "text-red-400"}>{selectedSubmission.status}</strong></div>
                <div>Score: <strong className="text-white">{selectedSubmission.score}% ({selectedSubmission.passedCount}/{selectedSubmission.totalCount} Passed)</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Submitted Source Code:</label>
                <pre className="bg-black p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-white/10">
                  {selectedSubmission.code}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setSelectedSubmission(null)} variant="outline" className="border-white/10 text-white">
                  Close Code Viewer
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageTransition>
  )
}
