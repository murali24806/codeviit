"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Play, Send, Trophy, Clock, CheckCircle2, XCircle, AlertTriangle, Layers, Code } from "lucide-react"
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
        setTimeRemaining("Contest Ended")
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

  // Run Code against Sample Test Cases
  const handleRunSampleCases = async () => {
    if (!currentQuestion) return
    setIsRunning(true)
    setResults([])
    setSubmissionFeedback(null)
    setConsoleOutput("Compiling and executing sample test cases...")
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
      setConsoleOutput(`Execution Completed.\nPassed: ${data.summary?.passed}/${data.summary?.total} test cases.`)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner className="w-8 h-8 text-blue-500" />
      </div>
    )
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-black text-white p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Contest Not Found</h2>
        <Link href="/dashboard">
          <Button variant="outline" className="border-white/10 text-white">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white flex flex-col">
        
        {/* Top Header Navigation */}
        <header className="bg-black/90 border-b border-white/10 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between sticky top-0 z-50 gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="font-bold text-sm sm:text-base text-white">{contest.title}</span>
              <span className="text-xs text-zinc-500 ml-2 hidden sm:inline">Participant: {user?.name} ({user?.registrationNumber || 'Student'})</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Live Clock */}
            <div className="flex items-center gap-1.5 bg-blue-950/80 border border-blue-800/60 px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono font-bold text-blue-300">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeRemaining || "00:00:00"}</span>
            </div>

            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[110px] sm:w-[130px] bg-white/5 border-white/10 text-white rounded-full text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-white text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleRunSampleCases}
              disabled={isRunning || isSubmitting}
              size="sm"
              variant="outline"
              className="rounded-full border-white/10 text-zinc-300 hover:text-white text-xs px-3"
            >
              {isRunning ? <Spinner className="w-3.5 h-3.5" /> : <><Play className="w-3.5 h-3.5 mr-1" /> Run Code</>}
            </Button>

            <Button
              onClick={handleSubmitSolution}
              disabled={isRunning || isSubmitting}
              size="sm"
              className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 sm:px-4 font-semibold shadow-lg shadow-emerald-600/20"
            >
              {isSubmitting ? <Spinner className="w-3.5 h-3.5" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Submit</>}
            </Button>
          </div>
        </header>

        {/* Problem Tabs Header */}
        <div className="bg-zinc-950 border-b border-white/10 px-4 flex items-center gap-2 overflow-x-auto h-11 text-nowrap">
          {contest.questions?.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => {
                setActiveQuestionIndex(idx)
                setResults([])
                setSubmissionFeedback(null)
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
                activeQuestionIndex === idx
                  ? "bg-blue-600 text-white shadow"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>P{idx + 1}. {q.title}</span>
            </button>
          ))}
        </div>

        {/* Mobile View Switcher */}
        <div className="lg:hidden flex bg-zinc-900 border-b border-white/10">
          <button
            onClick={() => setMobileTab("problem")}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              mobileTab === "problem" ? "border-blue-500 text-blue-400 bg-white/5" : "border-transparent text-zinc-400"
            }`}
          >
            Problem Statement
          </button>
          <button
            onClick={() => setMobileTab("code")}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              mobileTab === "code" ? "border-blue-500 text-blue-400 bg-white/5" : "border-transparent text-zinc-400"
            }`}
          >
            Code Editor
          </button>
          <button
            onClick={() => setMobileTab("output")}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              mobileTab === "output" ? "border-blue-500 text-blue-400 bg-white/5" : "border-transparent text-zinc-400"
            }`}
          >
            Output & Results
          </button>
        </div>

        {/* Main Workspace (Split View on Desktop, Tabbed on Mobile) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Problem Description */}
          <div className={`lg:col-span-5 border-r border-white/10 overflow-y-auto p-4 sm:p-6 space-y-6 max-h-[calc(100vh-140px)] ${
            mobileTab === "problem" ? "block" : "hidden lg:block"
          }`}>
            {currentQuestion ? (
              <>
                <div>
                  <h1 className="text-2xl font-extrabold text-white mb-2">{currentQuestion.title}</h1>
                  {currentQuestion.constraints && (
                    <span className="inline-block bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-2.5 py-0.5 rounded-full">
                      Constraints: {currentQuestion.constraints}
                    </span>
                  )}
                </div>

                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {currentQuestion.description || "No problem statement provided."}
                </div>

                {currentQuestion.inputFormat && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Input Format</h3>
                    <p className="text-xs text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5">{currentQuestion.inputFormat}</p>
                  </div>
                )}

                {currentQuestion.outputFormat && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Output Format</h3>
                    <p className="text-xs text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5">{currentQuestion.outputFormat}</p>
                  </div>
                )}

                {currentQuestion.testCases?.[0] && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Example Test Case</h3>
                    <div className="space-y-2">
                      <div className="bg-zinc-900 p-3 rounded-xl border border-white/5 text-xs font-mono">
                        <span className="text-zinc-500 block text-[10px] uppercase mb-1">Input:</span>
                        <pre className="text-blue-300">{currentQuestion.testCases[0].input}</pre>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded-xl border border-white/5 text-xs font-mono">
                        <span className="text-zinc-500 block text-[10px] uppercase mb-1">Output:</span>
                        <pre className="text-emerald-300">{currentQuestion.testCases[0].expectedOutput}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-zinc-500 text-center py-12">Select a question to view statement.</div>
            )}
          </div>

          {/* Right Column: Code Editor & Console Output */}
          <div className={`lg:col-span-7 flex flex-col h-[calc(100vh-140px)] ${
            mobileTab === "problem" ? "hidden lg:flex" : "flex"
          }`}>
            
            {/* Editor Area */}
            <div className={`flex-1 bg-zinc-950 p-2 relative overflow-hidden ${
              mobileTab === "output" ? "hidden lg:block" : "block"
            }`}>
              <CodeEditor
                value={code}
                onChange={setCode}
                language={selectedLanguage}
              />
            </div>

            {/* Submission / Execution Feedback Panel */}
            <div className={`border-t border-white/10 bg-black p-4 overflow-y-auto font-mono text-xs ${
              mobileTab === "code" ? "hidden lg:block lg:h-64" : "flex-1 lg:h-64"
            }`}>
              
              {submissionFeedback && (
                <div className={`p-4 rounded-xl mb-4 border ${
                  submissionFeedback.status === "Accepted"
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                    : "bg-red-950/80 border-red-500/50 text-red-300"
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

              <div className="text-zinc-400 font-semibold mb-2 flex items-center justify-between">
                <span>Execution Output & Test Results:</span>
              </div>

              {consoleOutput && (
                <pre className="text-zinc-300 bg-zinc-900/80 p-3 rounded-xl border border-white/5 mb-3 whitespace-pre-wrap">
                  {consoleOutput}
                </pre>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        res.passed
                          ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                          : "bg-red-950/40 border-red-500/30 text-red-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs">Test Case #{idx + 1}</span>
                        <span>{res.passed ? "PASSED" : "FAILED"}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300 mt-2 font-mono">
                        <div>Input: <span className="text-zinc-400">{res.input}</span></div>
                        <div>Expected: <span className="text-zinc-400">{res.expectedOutput}</span></div>
                        <div className="col-span-1 sm:col-span-2">
                          Actual Output: <span className={res.passed ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{res.actualOutput || "(empty)"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </PageTransition>
  )
}
