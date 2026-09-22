"use client"

import { Plus, X, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { TestCase } from "@/lib/types"

interface TestCaseManagerProps {
  testCases: TestCase[]
  onUpdate: (testCases: TestCase[]) => void
}

export function TestCaseManager({ testCases, onUpdate }: TestCaseManagerProps) {
  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: "tc_" + Math.random().toString(36).substr(2, 9),
      input: "",
      expectedOutput: "",
      isHidden: false,
    }
    onUpdate([...testCases, newTestCase])
  }

  const removeTestCase = (id: string) => {
    if (testCases.length > 1) {
      onUpdate(testCases.filter((tc) => tc.id !== id))
    }
  }

  const updateTestCase = (id: string, field: "input" | "expectedOutput" | "isHidden" | "points", value: string | boolean | number) => {
    onUpdate(
      testCases.map((tc) =>
        tc.id === id ? { ...tc, [field]: value } : tc
      )
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
        Test Cases
      </h3>
      <div className="flex flex-col gap-4">
        {testCases.map((testCase, index) => (
          <div
            key={testCase.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">
                Test Case {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateTestCase(testCase.id, "isHidden", !testCase.isHidden)}
                  className={`p-1.5 rounded-md transition-all ${
                    testCase.isHidden 
                      ? "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20" 
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  }`}
                  title={testCase.isHidden ? "Hidden from students" : "Visible to students"}
                >
                  {testCase.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {testCases.length > 1 && (
                  <button
                    onClick={() => removeTestCase(testCase.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Input</label>
                <Textarea
                  value={testCase.input}
                  onChange={(e) => updateTestCase(testCase.id, "input", e.target.value)}
                  placeholder="Enter input..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg text-sm font-mono min-h-[60px] resize-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Expected Output</label>
                <Textarea
                  value={testCase.expectedOutput}
                  onChange={(e) => updateTestCase(testCase.id, "expectedOutput", e.target.value)}
                  placeholder="Enter expected output..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg text-sm font-mono min-h-[60px] resize-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="w-full sm:w-1/3">
                <label className="text-xs text-white/50 mb-1 block">Points</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder={`Auto (${Math.round(100 / testCases.length)})`}
                  value={testCase.points !== undefined ? testCase.points : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      updateTestCase(testCase.id, "points", undefined as any);
                    } else {
                      updateTestCase(testCase.id, "points", parseInt(val) || 0);
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg text-sm font-mono p-2 focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button
        onClick={addTestCase}
        variant="ghost"
        className="border-2 border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 hover:bg-transparent rounded-xl h-12 transition-all"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Test Case
      </Button>
    </div>
  )
}
