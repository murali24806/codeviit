"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Code2, ChevronRight, BrainCircuit } from "lucide-react"
import type { Exercise } from "@/lib/types"
import { Navbar } from "@/components/navbar"

export default function ExercisesPage() {
  const { user, authFetch } = useAuth()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user === null) {
      router.push("/auth")
    } else if (user) {
      fetchExercises()
    }
  }, [user, router])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        Loading exercises...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-zinc-300 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 pt-20">
        
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Problemset</h1>
        </div>

        <div className="bg-[#282828] rounded-lg overflow-hidden border border-[#3e3e42]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#3e3e42] text-[#eff1f6] text-sm">
                  <th className="px-4 py-3 font-medium w-12 text-center">Status</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium w-32">Difficulty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3e3e42]">
                {exercises.map((exercise, idx) => (
                  <tr key={exercise.id} className="hover:bg-[#333333] transition-colors group cursor-pointer" onClick={() => router.push(`/exercises/${exercise.id}`)}>
                    <td className="px-4 py-3 text-center">
                      {/* Placeholder for status checkmark */}
                    </td>
                    <td className="px-4 py-3 text-[#eff1f6] group-hover:text-blue-400 font-medium transition-colors">
                      {idx + 1}. {exercise.title}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`${
                        exercise.difficulty === 'Easy' ? 'text-emerald-500' :
                        exercise.difficulty === 'Medium' ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
                {exercises.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-zinc-500">
                      No problems available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}
