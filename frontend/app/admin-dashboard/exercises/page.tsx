"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Link as LinkIcon, Trash2, Edit2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Exercise, TestCase } from "@/lib/types"

export default function AdminExercisesPage() {
  const { user, isAdmin, authFetch } = useAuth()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  // LeetCode Import State
  const [leetcodeUrl, setLeetcodeUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState("")

  useEffect(() => {
    if (user && !isAdmin) {
      router.push("/dashboard")
    } else if (user && isAdmin) {
      fetchExercises()
    }
  }, [user, isAdmin, router])

  const fetchExercises = async () => {
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exercises`)
      const data = await res.json()
      if (data.exercises) {
        setExercises(data.exercises)
      }
    } catch (error) {
      console.error("Failed to fetch exercises:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLeetCodeImport = async () => {
    if (!leetcodeUrl) return
    setIsImporting(true)
    setImportError("")
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/scrape-leetcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: leetcodeUrl })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to import")
      
      // We got the data, now we need to create the exercise
      const scrapedData = data.data
      
      const newExercise: Partial<Exercise> = {
        title: scrapedData.title,
        description: scrapedData.description,
        difficulty: scrapedData.difficulty || 'Medium',
        testCases: scrapedData.testCases || [],
        tags: ["leetcode"],
      }
      
      const saveRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExercise)
      })
      
      if (saveRes.ok) {
        setLeetcodeUrl("")
        fetchExercises()
      } else {
        const errorData = await saveRes.json()
        setImportError(errorData.error || "Failed to save exercise")
      }
    } catch (error: any) {
      setImportError(error.message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exercise?")) return
    try {
      await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exercises/${id}`, {
        method: "DELETE"
      })
      fetchExercises()
    } catch (error) {
      console.error("Failed to delete", error)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading exercises...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-6 sm:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Practice Exercises</h1>
            <p className="text-zinc-500">Manage coding problems for student practice.</p>
          </div>
        </div>

        <div className="bg-[#1e1e1e] border border-[#383838] p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Import from LeetCode
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={leetcodeUrl}
                onChange={(e) => setLeetcodeUrl(e.target.value)}
                placeholder="https://leetcode.com/problems/two-sum/"
                className="pl-9 bg-[#111] border-[#333] text-white focus-visible:ring-emerald-500/50"
              />
            </div>
            <Button
              onClick={handleLeetCodeImport}
              disabled={!leetcodeUrl || isImporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
            </Button>
          </div>
          {importError && (
            <p className="text-red-400 mt-3 text-sm">{importError}</p>
          )}
          <p className="text-xs text-zinc-500 mt-3">
            Automatically extracts problem statement and basic example test cases using LeetCode's public GraphQL API. You may still need to edit the problem to add hidden test cases manually.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((ex) => (
            <div key={ex.id} className="bg-[#111] border border-[#222] p-5 rounded-xl hover:border-[#444] transition-colors group relative">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-white line-clamp-1 pr-8">{ex.title}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  ex.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  ex.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {ex.difficulty}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-4 line-clamp-2">
                {ex.description || "No description provided."}
              </p>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{ex.testCases?.length || 0} Testcases</span>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(ex.id)} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {exercises.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-[#333] rounded-xl">
              No exercises added yet. Import one from LeetCode!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
