"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Play, Check, ChevronDown, ChevronUp, Terminal, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageTransition } from "@/components/page-transition"
import { CodeEditor } from "@/components/editor/code-editor"
import { TestCaseManager } from "@/components/editor/test-case-manager"
import { AIAssistant } from "@/components/editor/ai-assistant"
import { useProblems } from "@/lib/problems-context"
import { LANGUAGES, type TestCase, type TestResult, type Language } from "@/lib/types"

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

export default function EditorPage() {
  const router = useRouter()
  const { createProblem, updateProblem, saveStatus } = useProblems()

  // LOCAL STATE — always starts blank for new problem
  const [localTitle, setLocalTitle] = useState("")
  const [localDescription, setLocalDescription] = useState("")
  const [localCode, setLocalCode] = useState("")
  const [localTestCases, setLocalTestCases] = useState<TestCase[]>([
    { id: "tc_1", input: "", expectedOutput: "" }
  ])
  const [localLanguage, setLocalLanguage] = useState("python")
  const [problemId, setProblemId] = useState<string | null>(null)

  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [consoleOutput, setConsoleOutput] = useState("")
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true)
  const [activeConsoleTab, setActiveConsoleTab] = useState<"testcases" | "result">("testcases")

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Always create a FRESH problem on mount
  useEffect(() => {
    const newProblem = createProblem()
    setProblemId(newProblem.id)
  }, [])

  // Debounced save
  const scheduleSave = useCallback((updates: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateProblem(updates)
    }, 2000)
  }, [updateProblem])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleTitleChange = (title: string) => {
    setLocalTitle(title)
    scheduleSave({ title })
  }

  const handleDescriptionChange = (description: string) => {
    setLocalDescription(description)
    scheduleSave({ description })
  }

  const handleLanguageChange = (language: string) => {
    setLocalLanguage(language)
    updateProblem({ language: language as Language })
  }

  const handleCodeChange = (code: string) => {
    setLocalCode(code)
    scheduleSave({ code })
  }

  const handleTestCasesChange = (testCases: TestCase[]) => {
    setLocalTestCases(testCases)
    scheduleSave({ testCases })
  }

  const handleRunCode = async () => {
    setIsRunning(true)
    setResults([])
    setConsoleOutput("Executing code...")
    setActiveConsoleTab("result")
    setIsConsoleExpanded(true)

    try {
      const response = await fetch(`${BACKEND_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: localLanguage,
          code: localCode,
          testCases: localTestCases,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Execution failed")
      }

      setResults(data.results || [])
      setConsoleOutput(
        `Execution Complete.\n${data.summary?.passed}/${data.summary?.total} test cases passed.`
      )
    } catch (error) {
      setConsoleOutput(
        `Error: ${error instanceof Error ? error.message : "Execution failed"}`
      )
    } finally {
      setIsRunning(false)
    }
  }

  const SaveStatusIndicator = () => {
    if (saveStatus === "saving") {
      return <span className="text-zinc-400 text-xs font-mono">Saving...</span>
    }
    if (saveStatus === "saved") {
      return (
        <span className="text-emerald-400 text-xs font-mono flex items-center gap-1 font-semibold">
          <Check className="w-3.5 h-3.5" />
          Saved
        </span>
      )
    }
    return null
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#1a1a1a] text-[#eff1f6] flex flex-col h-screen overflow-hidden font-sans">
        
        {/* Top Navigation Header (LeetCode Style) */}
        <header className="bg-[#282828] border-b border-[#383838] px-4 h-12 flex items-center justify-between shrink-0 select-none z-50">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors" title="Back to Dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <span className="font-bold text-sm text-white tracking-wide">Practice Code Sandbox</span>
          </div>

          <div className="flex items-center gap-3">
            <SaveStatusIndicator />

            <Select value={localLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[120px] bg-[#333] border-[#444] text-white rounded-md text-xs h-7 focus:ring-0">
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

            {/* LeetCode Run Button */}
            <Button
              onClick={handleRunCode}
              disabled={isRunning}
              size="sm"
              className="h-7 rounded-md bg-[#2cbb5d] hover:bg-[#269e4f] text-white text-xs px-4 font-bold shadow-md transition-all"
            >
              {isRunning ? (
                <Spinner className="w-3.5 h-3.5 text-white" />
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
                  Run Code
                </>
              )}
            </Button>
          </div>
        </header>

        {/* LeetCode IDE Split Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-[#1a1a1a] p-1.5 gap-1.5">
          
          {/* Left Panel: Problem Creator & AI Assistant */}
          <div className="md:col-span-5 bg-[#282828] rounded-xl border border-[#383838] flex flex-col overflow-hidden">
            <div className="bg-[#222] border-b border-[#383838] px-3 h-10 flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Problem Details & Testcases
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <Input
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Problem Title (e.g. Reverse Linked List)"
                className="bg-[#1e1e1e] border-[#383838] text-xl font-bold text-white placeholder:text-zinc-500 focus:border-blue-500"
              />

              <Textarea
                value={localDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Describe your problem statement, constraints, and requirements..."
                className="bg-[#1e1e1e] border-[#383838] text-sm text-zinc-300 placeholder:text-zinc-500 rounded-lg min-h-[140px] resize-y focus:border-blue-500"
              />

              <div className="h-px bg-[#383838]" />

              <TestCaseManager
                testCases={localTestCases}
                onUpdate={handleTestCasesChange}
              />

              <div className="h-px bg-[#383838]" />

              <AIAssistant
                problemDescription={localDescription}
                code={localCode}
                existingTestCases={localTestCases}
                onTestCasesGenerated={handleTestCasesChange}
              />
            </div>
          </div>

          {/* Right Panel: Full Height Editor & Console Panel */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden">
            
            {/* Upper Section: Code Editor */}
            <div className="flex-1 overflow-hidden min-h-[350px]">
              <CodeEditor
                value={localCode}
                onChange={handleCodeChange}
                language={localLanguage}
              />
            </div>

            {/* Lower Section: Collapsible LeetCode Console Panel */}
            <div className={`bg-[#282828] border border-[#383838] rounded-xl mt-1.5 flex flex-col transition-all ${
              isConsoleExpanded ? "h-64 sm:h-72" : "h-10"
            }`}>
              <div className="bg-[#222] border-b border-[#383838] px-3 h-10 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveConsoleTab("testcases")
                      setIsConsoleExpanded(true)
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      activeConsoleTab === "testcases" ? "bg-[#333] text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Testcases ({localTestCases.length})
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
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Results Output
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

              {isConsoleExpanded && (
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-[#d4d4d4]">
                  {activeConsoleTab === "testcases" ? (
                    <div className="space-y-3">
                      {localTestCases.map((tc, idx) => (
                        <div key={tc.id || idx} className="bg-[#1e1e1e] p-3 rounded-lg border border-[#383838] space-y-1.5">
                          <span className="text-zinc-400 font-bold block text-[11px] uppercase">Case {idx + 1}:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>Input: <span className="text-blue-300">{tc.input || "(empty)"}</span></div>
                            <div>Expected: <span className="text-emerald-300">{tc.expectedOutput || "(empty)"}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {consoleOutput && (
                        <pre className="bg-[#1e1e1e] p-3 rounded-lg border border-[#383838] text-zinc-300 whitespace-pre-wrap">
                          {consoleOutput}
                        </pre>
                      )}

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
