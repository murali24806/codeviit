"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Play, Send, Clock, CheckCircle2, XCircle, 
  RotateCcw, ChevronUp, ChevronDown, Copy, Check, Terminal, FileText, Layers 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageTransition } from "@/components/page-transition"
import { CodeEditor } from "@/components/editor/code-editor"
import { useAuth } from "@/lib/auth-context"
import { LANGUAGES, type Contest, type ContestQuestion, type TestResult, type Language } from "@/lib/types"

const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return ''
  }
  return 'http://localhost:5000'
}
const BACKEND_URL = getBackendUrl()

const DEFAULT_STARTER_CODE: Record<string, string> = {
  python: `# Read from stdin and write to stdout\nimport sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    # Write your solution here\n\nif __name__ == '__main__':\n    solve()\n`,
  cpp: `// Read from stdin and write to stdout\n#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}\n`,
  java: `// Read from stdin and write to stdout\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n`,
  javascript: `// Read from stdin and write to stdout\nconst fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\n\n// Write your solution here\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`
}

export default function ContestArenaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [contest, setContest] = useState<Contest | null>(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("python")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Execution & Submission state
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [consoleOutput, setConsoleOutput] = useState("")
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: string
    score: number
    passedCount: number
    totalCount: number
  } | null>(null)

  // UI Panels state (LeetCode Style)
  const [activeLeftTab, setActiveLeftTab] = useState<"description" | "submissions">("description")
  const [activeConsoleTab, setActiveConsoleTab] = useState<"testcase" | "result">("testcase")
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true)
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [mobileTab, setMobileTab] = useState<"problem" | "code" | "output">("problem")

  useEffect(() => {
    fetchContestDetails()
  }, [contestId])

  const fetchContestDetails = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/contests/${contestId}`)
      if (res.ok) {
        const data = await res.json()
        setContest(data.contest)
        if (data.contest?.questions?.[0]) {
          setCode(DEFAULT_STARTER_CODE["python"])
        }
      }
    } catch (err) {
      console.error("Error fetching contest:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Contest timer effect
  useEffect(() => {
    if (!contest) return
    const updateTimer = () => {
      const end = new Date(contest.endTime).getTime()
      const now = new Date().getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeRemaining("Ended")
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [contest])

  const currentQuestion: ContestQuestion | undefined = contest?.questions[activeQuestionIndex]

  const handleLanguageChange = (lang: string) => {
    const l = lang as Language
    setSelectedLanguage(l)
    setCode(DEFAULT_STARTER_CODE[l] || `# Code here in ${l}`)
  }

  const handleResetCode = () => {
    if (confirm("Reset code to starter template?")) {
      setCode(DEFAULT_STARTER_CODE[selectedLanguage] || "")
    }
  }

  // Run Code against Sample Test Cases
  const handleRunSampleCases = async () => {
    if (!currentQuestion) return
    setIsRunning(true)
    setResults([])
    setSubmissionFeedback(null)
    setActiveConsoleTab("result")
    setIsConsoleExpanded(true)
    setConsoleOutput("Compiling and executing test cases...")
    setMobileTab("output")

    try {
      const testCasesToRun = currentQuestion.testCases?.length > 0
        ? currentQuestion.testCases
        : [{ id: "sample", input: currentQuestion.sampleInput || "", expectedOutput: currentQuestion.sampleOutput || "" }]

      const res = await fetch(`${BACKEND_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code,
          testCases: testCasesToRun
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Execution failed")

      setResults(data.results || [])
      setConsoleOutput(`Execution Finished.\nPassed: ${data.summary?.passed}/${data.summary?.total} test cases.`)
    } catch (err: any) {
      setConsoleOutput(`Error: ${err.message || "Failed to execute code"}`)
    } finally {
      setIsRunning(false)
    }
  }

  // Submit Solution for Evaluation
  const handleSubmitSolution = async () => {
    if (!currentQuestion || !contest) return
    setIsSubmitting(true)
    setResults([])
    setSubmissionFeedback(null)
    setActiveConsoleTab("result")
    setIsConsoleExpanded(true)
    setConsoleOutput("Evaluating submission against contest test cases...")
    setMobileTab("output")

    try {
      const res = await fetch(`${BACKEND_URL}/api/contests/${contest.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestId: contest.id,
          questionId: currentQuestion.id,
          userId: user?.id,
          userName: user?.name,
          registrationNumber: user?.registrationNumber,
          email: user?.email,
          language: selectedLanguage,
          code
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")

      const sub = data.submission
      setResults(sub.testResults || [])
      setSubmissionFeedback({
        status: sub.status,
        score: sub.score,
        passedCount: sub.passedCount,
        totalCount: sub.totalCount
      })
      setConsoleOutput(`Submission Evaluated!\nStatus: ${sub.status}\nScore: ${sub.score}%\nTest Cases Passed: ${sub.passedCount}/${sub.totalCount}`)
    } catch (err: any) {
      setConsoleOutput(`Error: ${err.message || "Failed to submit solution"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <Spinner className="w-8 h-8 text-emerald-500" />
      </div>
    )
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white p-8 text-center flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-4">Contest Not Found</h2>
        <Link href="/dashboard">
          <Button variant="outline" className="border-white/10 text-white">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#1a1a1a] text-[#eff1f6] flex flex-col h-screen overflow-hidden font-sans">
        
        {/* LeetCode Style Top Navigation Header */}
        <header className="bg-[#282828] border-b border-[#383838] px-4 h-12 flex items-center justify-between shrink-0 select-none z-50">
          
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors" title="Back to Dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide">{contest.title}</span>
              <span className="text-[11px] text-zinc-400 hidden lg:inline bg-[#333] px-2 py-0.5 rounded font-mono">
                {user?.name || 'Student'} ({user?.registrationNumber || 'Guest'})
              </span>
            </div>
          </div>

          {/* Problem Selector Pills */}
          <div className="hidden md:flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#383838]">
            {contest.questions?.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => {
                  setActiveQuestionIndex(idx)
                  setResults([])
                  setSubmissionFeedback(null)
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  activeQuestionIndex === idx
                    ? "bg-[#333] text-white shadow-sm font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{idx + 1}. {q.title}</span>
              </button>
            ))}
          </div>

          {/* Right Action Bar (LeetCode Style) */}
          <div className="flex items-center gap-2.5">
            {/* Live Clock Badge */}
            <div className="flex items-center gap-1.5 bg-[#1e1e1e] border border-blue-500/40 px-2.5 py-1 rounded-md text-xs font-mono font-bold text-blue-400">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{timeRemaining || "00:00:00"}</span>
            </div>

            {/* Language Selector */}
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[110px] bg-[#333] border-[#444] text-white rounded-md text-xs h-7 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#282828] border-[#444]">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-white text-xs hover:bg-[#383838] focus:bg-[#383838]">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Code */}
            <button
              onClick={handleResetCode}
              className="p-1.5 text-zinc-400 hover:text-white bg-[#333] hover:bg-[#444] rounded-md transition-colors"
              title="Reset Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* LeetCode Run Button */}
            <Button
              onClick={handleRunSampleCases}
              disabled={isRunning || isSubmitting}
              size="sm"
              className="h-7 rounded-md bg-[#333] hover:bg-[#444] text-zinc-200 hover:text-white text-xs px-3 font-semibold border border-[#444] transition-all"
            >
              {isRunning ? <Spinner className="w-3.5 h-3.5 text-white" /> : <><Play className="w-3.5 h-3.5 mr-1 text-zinc-300 fill-zinc-300" /> Run</>}
            </Button>

            {/* LeetCode Submit Button */}
            <Button
              onClick={handleSubmitSolution}
              disabled={isRunning || isSubmitting}
              size="sm"
              className="h-7 rounded-md bg-[#2cbb5d] hover:bg-[#269e4f] text-white text-xs px-3 sm:px-4 font-bold shadow-md transition-all"
            >
              {isSubmitting ? <Spinner className="w-3.5 h-3.5 text-white" /> : <><Send className="w-3.5 h-3.5 mr-1.5 fill-white" /> Submit</>}
            </Button>
          </div>
        </header>

        {/* Mobile View Switcher */}
        <div className="lg:hidden flex bg-[#282828] border-b border-[#383838]">
          <button
            onClick={() => setMobileTab("problem")}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-all ${
              mobileTab === "problem" ? "border-emerald-500 text-emerald-400 bg-[#333]" : "border-transparent text-zinc-400"
            }`}
          >
            Problem Statement
          </button>
          <button
            onClick={() => setMobileTab("code")}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-all ${
              mobileTab === "code" ? "border-emerald-500 text-emerald-400 bg-[#333]" : "border-transparent text-zinc-400"
            }`}
          >
            Code Editor
          </button>
          <button
            onClick={() => setMobileTab("output")}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-all ${
              mobileTab === "output" ? "border-emerald-500 text-emerald-400 bg-[#333]" : "border-transparent text-zinc-400"
            }`}
          >
            Console Output
          </button>
        </div>

        {/* LeetCode Split Workspace (Full Screen IDE Layout) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#1a1a1a] p-1.5 gap-1.5">
          
          {/* LEFT PANEL: Problem Description (LeetCode Style) */}
          <div className={`lg:col-span-5 bg-[#282828] rounded-xl border border-[#383838] flex flex-col overflow-hidden ${
            mobileTab === "problem" ? "block" : "hidden lg:flex"
          }`}>
            {/* Problem Navigation Tabs */}
            <div className="bg-[#222] border-b border-[#383838] px-3 h-10 flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveLeftTab("description")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeLeftTab === "description" ? "bg-[#333] text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Description
              </button>
              <button
                onClick={() => setActiveLeftTab("submissions")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeLeftTab === "submissions" ? "bg-[#333] text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Submissions
              </button>
            </div>

            {/* Problem Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-[#d4d4d4] leading-relaxed">
              {currentQuestion ? (
                activeLeftTab === "description" ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h1 className="text-xl font-bold text-white tracking-tight">
                          {activeQuestionIndex + 1}. {currentQuestion.title}
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Medium
                        </span>
                      </div>

                      {currentQuestion.constraints && (
                        <div className="inline-block bg-[#1e1e1e] border border-[#383838] text-zinc-400 text-xs px-2.5 py-1 rounded-md font-mono mb-3">
                          Constraints: {currentQuestion.constraints}
                        </div>
                      )}
                    </div>

                    {/* Problem Statement */}
                    <div className="prose prose-invert max-w-none text-zinc-300 whitespace-pre-line text-sm leading-relaxed">
                      {currentQuestion.description || "No problem statement provided."}
                    </div>

                    {/* Input Format */}
                    {currentQuestion.inputFormat && (
                      <div className="space-y-1.5 pt-2">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Input Format</h3>
                        <div className="bg-[#1e1e1e] p-3 rounded-lg border border-[#383838] text-xs text-zinc-300 font-mono">
                          {currentQuestion.inputFormat}
                        </div>
                      </div>
                    )}

                    {/* Output Format */}
                    {currentQuestion.outputFormat && (
                      <div className="space-y-1.5 pt-2">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Output Format</h3>
                        <div className="bg-[#1e1e1e] p-3 rounded-lg border border-[#383838] text-xs text-zinc-300 font-mono">
                          {currentQuestion.outputFormat}
                        </div>
                      </div>
                    )}

                    {/* Example Testcases */}
                    {currentQuestion.testCases?.map((tc, idx) => (
                      <div key={tc.id || idx} className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-zinc-300">Example {idx + 1}:</h3>
                          <button
                            onClick={() => handleCopyText(tc.input, idx)}
                            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedIndex === idx ? "Copied" : "Copy Input"}
                          </button>
                        </div>
                        <div className="bg-[#1e1e1e] p-3.5 rounded-lg border border-[#383838] space-y-2 text-xs font-mono">
                          <div>
                            <span className="text-zinc-500 font-semibold block text-[11px] uppercase mb-0.5">Input:</span>
                            <pre className="text-blue-300 whitespace-pre-wrap">{tc.input || "(empty)"}</pre>
                          </div>
                          <div>
                            <span className="text-zinc-500 font-semibold block text-[11px] uppercase mb-0.5">Output:</span>
                            <pre className="text-emerald-400 whitespace-pre-wrap">{tc.expectedOutput || "(empty)"}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  /* Submissions Tab */
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-white mb-2">Submission History</h3>
                    {submissionFeedback ? (
                      <div className={`p-4 rounded-xl border ${
                        submissionFeedback.status === "Accepted"
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                          : "bg-red-950/40 border-red-500/40 text-red-300"
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm flex items-center gap-2">
                            {submissionFeedback.status === "Accepted" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                            {submissionFeedback.status}
                          </span>
                          <span className="text-xs font-mono font-bold">{submissionFeedback.score}%</span>
                        </div>
                        <p className="text-xs opacity-90 font-mono mt-1">
                          Test Cases Passed: {submissionFeedback.passedCount} / {submissionFeedback.totalCount}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-zinc-500 text-xs">
                        No submissions recorded for this problem yet.
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-zinc-500 text-center py-12">Select a question to view statement.</div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Code Editor & LeetCode Console */}
          <div className={`lg:col-span-7 flex flex-col h-full overflow-hidden ${
            mobileTab === "problem" ? "hidden lg:flex" : "flex"
          }`}>
            
            {/* Upper Section: Full Flex Code Editor */}
            <div className={`flex-1 overflow-hidden min-h-[350px] ${
              mobileTab === "output" ? "hidden lg:block" : "block"
            }`}>
              <CodeEditor
                value={code}
                onChange={setCode}
                language={selectedLanguage}
              />
            </div>

            {/* Lower Section: Collapsible LeetCode Console Panel */}
            <div className={`bg-[#282828] border border-[#383838] rounded-xl mt-1.5 flex flex-col transition-all ${
              isConsoleExpanded ? "h-64 sm:h-72" : "h-10"
            }`}>
              {/* Console Bar Controls */}
              <div className="bg-[#222] border-b border-[#383838] px-3 h-10 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveConsoleTab("testcase")
                      setIsConsoleExpanded(true)
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      activeConsoleTab === "testcase" ? "bg-[#333] text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Testcase
                  </button>
                  <button
                    onClick={() => {
                      setActiveConsoleTab("result")
                      setIsConsoleExpanded(true)
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeConsoleTab === "result" ? "bg-[#333] text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Test Result
                    {submissionFeedback && (
                      <span className={`w-2 h-2 rounded-full ${submissionFeedback.status === "Accepted" ? "bg-emerald-500" : "bg-red-500"}`} />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
                  className="text-zinc-400 hover:text-white p-1"
                  title={isConsoleExpanded ? "Collapse Console" : "Expand Console"}
                >
                  {isConsoleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>

              {/* Console Body */}
              {isConsoleExpanded && (
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-[#d4d4d4]">
                  
                  {activeConsoleTab === "testcase" && (
                    <div className="space-y-3">
                      {currentQuestion?.testCases && currentQuestion.testCases.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            {currentQuestion.testCases.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveTestCaseIndex(idx)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                  activeTestCaseIndex === idx
                                    ? "bg-[#333] text-white border border-[#444]"
                                    : "bg-[#1e1e1e] text-zinc-400 hover:text-white"
                                }`}
                              >
                                Case {idx + 1}
                              </button>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <span className="text-zinc-400 font-semibold block">Input =</span>
                            <pre className="bg-[#1e1e1e] p-3 rounded-lg border border-[#383838] text-blue-300 whitespace-pre-wrap">
                              {currentQuestion.testCases[activeTestCaseIndex]?.input || "(empty)"}
                            </pre>
                          </div>
                        </>
                      ) : (
                        <div className="text-zinc-500 py-4">No test cases configured for this problem.</div>
                      )}
                    </div>
                  )}

                  {activeConsoleTab === "result" && (
                    <div className="space-y-3">
                      {/* Submission Feedback Banner */}
                      {submissionFeedback && (
                        <div className={`p-3.5 rounded-xl border ${
                          submissionFeedback.status === "Accepted"
                            ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                            : "bg-red-950/60 border-red-500/50 text-red-300"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm flex items-center gap-2">
                              {submissionFeedback.status === "Accepted" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                              {submissionFeedback.status}
                            </span>
                            <span className="text-xs font-bold">Score: {submissionFeedback.score}%</span>
                          </div>
                          <p className="text-xs opacity-90">
                            Passed {submissionFeedback.passedCount} out of {submissionFeedback.totalCount} test cases.
                          </p>
                        </div>
                      )}

                      {/* Execution Console Logs */}
                      {consoleOutput && (
                        <pre className="bg-[#1e1e1e] p-3 rounded-lg border border-[#383838] text-zinc-300 whitespace-pre-wrap">
                          {consoleOutput}
                        </pre>
                      )}

                      {/* Detailed Test Results */}
                      {results.length > 0 && (
                        <div className="space-y-2.5">
                          {results.map((res, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border ${
                                res.passed
                                  ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                                  : "bg-red-950/30 border-red-500/30 text-red-300"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs">Testcase {idx + 1}</span>
                                <span className="font-bold text-[11px] uppercase">{res.passed ? "PASSED" : "FAILED"}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300 mt-2 font-mono">
                                <div>Input: <span className="text-zinc-400">{res.input}</span></div>
                                <div>Expected: <span className="text-zinc-400">{res.expectedOutput}</span></div>
                                <div className="col-span-1 sm:col-span-2">
                                  Output: <span className={res.passed ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{res.actualOutput || "(empty)"}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </PageTransition>
  )
}
