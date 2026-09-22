import React from 'react'

interface CircularProgressProps {
  totalPoints: number
  totalContests: number
}

export function CircularProgress({ totalPoints, totalContests }: CircularProgressProps) {
  const maxPossiblePoints = Math.max(totalContests * 100, 100) // Rough assumption, each contest = 100 points max
  const percentage = Math.min(Math.round((totalPoints / maxPossiblePoints) * 100) || 0, 100)
  
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 shadow-lg shadow-black/20 flex items-center justify-between">
      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        {/* Background Circle */}
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-[#282828]"
          />
          {/* Progress Circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-yellow-500 transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white leading-none">{totalPoints}</span>
          <span className="text-[10px] text-zinc-500">Points</span>
        </div>
      </div>

      <div className="flex-1 ml-6 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-emerald-400 font-semibold">Accepted</span>
            <span className="text-zinc-300 font-bold">{percentage}%</span>
          </div>
          <div className="w-full bg-[#282828] rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
          </div>
        </div>
        
        <div className="flex items-center gap-4 pt-2">
          <div className="text-center">
            <div className="text-xs text-zinc-500 mb-0.5">Contests</div>
            <div className="text-sm font-bold text-white">{totalContests}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
