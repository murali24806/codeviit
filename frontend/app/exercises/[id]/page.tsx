"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Play, Send, CheckCircle2, XCircle, 
  ChevronUp, ChevronDown, Copy, Check, Terminal, FileText 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageTransition } from "@/components/page-transition"
import { CodeEditor } from "@/components/editor/code-editor"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { useAuth } from "@/lib/auth-context"
import { LANGUAGES, type Exercise, type TestResult, type Language } from "@/lib/types"

const DEFAULT_STARTER_CODE: Record<string, string> = {
  python: `# Read from stdin and write to stdout\nimport sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    # Write your solution here\n\nif __name__ == '__main__':\n    solve()\n`,
  cpp: `// Read from stdin and write to stdout\n#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}\n`,
  java: `// Read from stdin and write to stdout\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n`,
  javascript: `// Read from stdin and write to stdout\nconst fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\n\n// Write your solution here\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`
}

export default function ExerciseArenaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: exerciseId } = use(params)
  const router = useRouter()
  const { user, authFetch } = useAuth()

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("python")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true)
  const [activeConsoleTab, setActiveConsoleTab] = useState<"testcase" | "result">("testcase")
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null)
  const [consoleOutput, setConsoleOutput] = useState("")

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [mobileTab, setMobileTab] = useState<"problem" | "output">("problem")

  useEffect(() => {
    if (user === null) {
      router.push("/auth")
    } else if (user) {
      fetchExercise()
    }
  }, [user, router, exerciseId])

  const fetchExercise = async () => {
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exercises/${exerciseId}`)
      const data = await res.json()
      if (data.exercise) {
        setExercise(data.exercise)
        if (data.exercise.starterCode && data.exercise.starterCode[selectedLanguage]) {
          setCode(data.exercise.starterCode[selectedLanguage])
        } else {
          setCode(DEFAULT_STARTER_CODE[selectedLanguage])
        }
      } else {
        router.push("/exercises")
      }
    } catch (error) {
      console.error("Failed to fetch exercise:", error)
      router.push("/exercises")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLanguageChange = (val: Language) => {
    setSelectedLanguage(val)
    if (exercise?.starterCode && exercise.starterCode[val]) {
      setCode(exercise.starterCode[val])
    } else {
      setCode(DEFAULT_STARTER_CODE[val])
    }
  }

  const handleRunCode = async () => {
    if (!exercise) return
    setIsRunning(true)
    setConsoleOutput("")
    setResults([])
    setSubmissionFeedback(null)
    setActiveConsoleTab("result")
    setIsConsoleExpanded(true)
    setMobileTab("output")

    try {
      const testCasesToRun = exercise.testCases?.length > 0 
        ? exercise.testCases 
        : [{ id: 'dummy', input: '', expectedOutput: '' }]

      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code,
          testCases: testCasesToRun
        })
      })
      const data = await res.json()
      
      if (res.ok && data.results) {
        setResults(data.results)
        setConsoleOutput(`Executed ${data.summary.total} test cases.\nPassed: ${data.summary.passed} | Failed: ${data.summary.failed}`)
      } else {
        setConsoleOutput(data.error || "Execution failed.")
        if (data.details) setConsoleOutput(prev => prev + "\n\n" + data.details)
      }
    } catch (error: any) {
      setConsoleOutput(`Network error: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!exercise) return
    setIsSubmitting(true)
    setConsoleOutput("Submitting solution...")
    setResults([])
    setSubmissionFeedback(null)
    setActiveConsoleTab("result")
    setIsConsoleExpanded(true)
    setMobileTab("output")

    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exercises/${exerciseId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code,
        })
      })
      const data = await res.json()
      
      if (res.ok && data.success && data.submission) {
        setSubmissionFeedback({
          status: data.submission.status,
          score: data.submission.score,
          passedCount: data.submission.passedCount,
          totalCount: data.submission.totalCount
        })
        if (data.submission.testResults) {
          setResults(data.submission.testResults)
        }
        setConsoleOutput("")
      } else {
        setConsoleOutput(data.error || "Submission failed.")
      }
    } catch (error: any) {
      setConsoleOutput(`Network error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (isLoading) {
    return <div className="h-screen bg-[#1a1a1a] flex items-center justify-center"><Spinner size="lg" /></div>
  }

  if (!exercise) return null

  // Shared left panel content
  const LeftPanelContent = (
    <div className="flex flex-col h-full overflow-hidden bg-[#282828]">
      <div className="bg-[#282828] border-b border-[#3e3e42] px-4 h-10 flex items-center shrink-0">
        <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Description
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{exercise.title}</h2>
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                exercise.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-500/10' :
                exercise.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-500/10' :
                'text-red-400 bg-red-500/10'
              }`}>
                {exercise.difficulty}
              </span>
            </div>
            {exercise.constraints && (
              <div className="inline-block bg-[#1a1a1a] border border-[#3e3e42] text-zinc-400 text-xs px-2.5 py-1 rounded-md font-mono mb-3">
                Constraints: {exercise.constraints}
              </div>
            )}
          </div>

          <div className="prose prose-invert max-w-none text-zinc-300 whitespace-pre-line text-sm leading-relaxed">
            {exercise.description}
          </div>

          {exercise.inputFormat && (
            <div className="space-y-1.5 pt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Input Format</h3>
              <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#3e3e42] text-xs text-zinc-300 font-mono">
                {exercise.inputFormat}
              </div>
            </div>
          )}
          {exercise.outputFormat && (
            <div className="space-y-1.5 pt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Output Format</h3>
              <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#3e3e42] text-xs text-zinc-300 font-mono">
                {exercise.outputFormat}
              </div>
            </div>
          )}

          {exercise.testCases?.map((tc, idx) => !tc.isHidden && (
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
              <div className="bg-[#1a1a1a] p-3.5 rounded-lg border border-[#3e3e42] space-y-2 text-xs font-mono">
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
        </div>
      </div>
    </div>
  )

  // Shared Console content
  const ConsoleContent = (
    <div className="flex flex-col h-full bg-[#282828] overflow-hidden">
      <div className="bg-[#282828] border-b border-[#3e3e42] px-3 h-10 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveConsoleTab("testcase"); setIsConsoleExpanded(true) }}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeConsoleTab === "testcase" ? "bg-[#3e3e42] text-white" : "text-zinc-400 hover:text-white"}`}
          >
            Testcase
          </button>
          <button
            onClick={() => { setActiveConsoleTab("result"); setIsConsoleExpanded(true) }}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${activeConsoleTab === "result" ? "bg-[#3e3e42] text-white" : "text-zinc-400 hover:text-white"}`}
          >
            Test Result
            {submissionFeedback && (
              <span className={`w-2 h-2 rounded-full ${submissionFeedback.status === "Accepted" ? "bg-emerald-500" : "bg-red-500"}`} />
            )}
          </button>
        </div>
        <button
          onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
          className="text-zinc-400 hover:text-white p-1 hidden lg:block"
        >
          {isConsoleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-[#d4d4d4]">
        {activeConsoleTab === "testcase" && (
          <div className="space-y-3">
            {exercise?.testCases && exercise.testCases.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  {exercise.testCases.map((tc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTestCaseIndex(idx)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        activeTestCaseIndex === idx ? "bg-[#3e3e42] text-white border border-[#4a4a50]" : "bg-[#1a1a1a] text-zinc-400 hover:text-white border border-[#3e3e42]"
                      }`}
                    >
                      Case {idx + 1} {tc.isHidden && '(Hidden)'}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <span className="text-zinc-400 font-semibold block">Input =</span>
                  <pre className="bg-[#1a1a1a] p-3 rounded-lg border border-[#3e3e42] text-blue-300 whitespace-pre-wrap">
                    {exercise.testCases[activeTestCaseIndex]?.isHidden 
                      ? "Hidden Test Case" 
                      : (exercise.testCases[activeTestCaseIndex]?.input || "(empty)")}
                  </pre>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 py-4">No test cases configured.</div>
            )}
          </div>
        )}

        {activeConsoleTab === "result" && (
          <div className="space-y-3">
            {submissionFeedback && (
              <div className={`p-3.5 rounded-xl border ${
                submissionFeedback.status === "Accepted" ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300" : "bg-red-950/60 border-red-500/50 text-red-300"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm flex items-center gap-2">
                    {submissionFeedback.status === "Accepted" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                    {submissionFeedback.status}
                  </span>
                  <span className="text-xs font-bold">Score: {submissionFeedback.score}%</span>
                </div>
                <p className="text-xs opacity-90">Passed {submissionFeedback.passedCount} out of {submissionFeedback.totalCount} test cases.</p>
              </div>
            )}

            {consoleOutput && (
              <pre className="bg-[#1a1a1a] p-3 rounded-lg border border-[#3e3e42] text-zinc-300 whitespace-pre-wrap">
                {consoleOutput}
              </pre>
            )}

            {results.length > 0 && (
              <div className="space-y-2.5">
                {results.map((res, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${res.passed ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300" : "bg-red-950/30 border-red-500/30 text-red-300"}`}>
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
                      {res.error && (
                        <div className="col-span-1 sm:col-span-2 mt-2 bg-red-950/40 p-2 rounded border border-red-500/20 text-red-300">
                          <span className="font-bold block mb-1">Error / Compiler Output:</span>
                          <pre className="whitespace-pre-wrap">{res.error}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <PageTransition>
      <div className="h-screen flex flex-col bg-[#1a1a1a] text-zinc-300 font-sans overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-14 bg-[#1a1a1a] border-b border-[#3e3e42] flex items-center justify-between px-4 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <Link href="/exercises" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold hidden sm:inline">Back</span>
            </Link>
            <div className="h-5 w-px bg-[#3e3e42] hidden sm:block" />
            <h1 className="text-sm font-bold text-white line-clamp-1">{exercise.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedLanguage} onValueChange={(val) => handleLanguageChange(val as Language)}>
              <SelectTrigger className="w-[130px] h-8 bg-[#282828] border-[#3e3e42] text-xs font-semibold text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#282828] border-[#3e3e42] text-white">
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs font-semibold focus:bg-[#3e3e42] focus:text-white">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRunCode} 
                disabled={isRunning || isSubmitting}
                className="h-8 bg-[#282828] hover:bg-[#3e3e42] text-zinc-300 border border-[#3e3e42] text-xs font-semibold px-3"
              >
                {isRunning ? <Spinner size="sm" className="mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />}
                Run
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
              >
                {isSubmitting ? <Spinner size="sm" className="mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                Submit
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Tabs */}
        <div className="lg:hidden flex bg-[#282828] border-b border-[#3e3e42] shrink-0">
          <button
            onClick={() => setMobileTab("problem")}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${mobileTab === "problem" ? "text-white border-b-2 border-emerald-500" : "text-zinc-500"}`}
          >
            <FileText className="w-4 h-4" /> Problem
          </button>
          <button
            onClick={() => setMobileTab("output")}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${mobileTab === "output" ? "text-white border-b-2 border-emerald-500" : "text-zinc-500"}`}
          >
            <Terminal className="w-4 h-4" /> Code & Output
          </button>
        </div>

        {/* Desktop Main Content (Resizable) */}
        <div className="hidden lg:flex flex-1 overflow-hidden p-1.5">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-xl overflow-hidden border border-[#3e3e42]">
            
            {/* Left Pane: Description */}
            <ResizablePanel defaultSize={40} minSize={20} className="bg-[#282828]">
              {LeftPanelContent}
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-black/30 w-1.5 hover:bg-emerald-500/50 transition-colors" />

            {/* Right Pane: Code & Console */}
            <ResizablePanel defaultSize={60} minSize={30} className="bg-[#1a1a1a]">
              <ResizablePanelGroup direction="vertical" className="h-full">
                
                {/* Top: Code Editor */}
                <ResizablePanel defaultSize={60} minSize={20} className="bg-[#1a1a1a] flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor value={code} onChange={setCode} language={selectedLanguage} />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-black/30 h-1.5 hover:bg-emerald-500/50 transition-colors" />

                {/* Bottom: Console */}
                <ResizablePanel 
                  defaultSize={isConsoleExpanded ? 40 : 5} 
                  minSize={isConsoleExpanded ? 10 : 5}
                  maxSize={isConsoleExpanded ? 80 : 5}
                  className="bg-[#282828]"
                >
                  {ConsoleContent}
                </ResizablePanel>

              </ResizablePanelGroup>
            </ResizablePanel>

          </ResizablePanelGroup>
        </div>

        {/* Mobile Main Content (Tabs) */}
        <div className="lg:hidden flex-1 overflow-hidden grid grid-cols-1 p-1.5">
          <div className={`bg-[#282828] border border-[#3e3e42] rounded-xl flex-col overflow-hidden ${mobileTab === "problem" ? "flex" : "hidden"}`}>
            {LeftPanelContent}
          </div>
          <div className={`flex-col h-full overflow-hidden ${mobileTab === "output" ? "flex" : "hidden"}`}>
            <div className="flex-1 overflow-hidden min-h-[300px] mb-1.5 border border-[#3e3e42] rounded-xl">
              <CodeEditor value={code} onChange={setCode} language={selectedLanguage} />
            </div>
            <div className="h-64 border border-[#3e3e42] rounded-xl overflow-hidden">
              {ConsoleContent}
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  )
}
