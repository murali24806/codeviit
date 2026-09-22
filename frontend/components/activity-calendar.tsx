import { useMemo } from "react"
import { Trophy } from "lucide-react"

interface ActivityCalendarProps {
  submissions: any[]
}

export function ActivityCalendar({ submissions }: ActivityCalendarProps) {
  // Generate last 150 days
  const days = 150
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const toLocalDateString = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const activityMap = useMemo(() => {
    const map = new Map<string, number>()
    submissions.forEach(sub => {
      const dateVal = sub.submittedAt || sub.createdAt || new Date().toISOString()
      const date = new Date(dateVal)
      const dateString = toLocalDateString(date)
      map.set(dateString, (map.get(dateString) || 0) + 1)
    })
    return map
  }, [submissions])

  const weeks = useMemo(() => {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - days)
    
    // Adjust to nearest Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const w = []
    let currentWeek = []
    
    let current = new Date(startDate)
    while (current <= today || currentWeek.length > 0) {
      if (currentWeek.length === 7) {
        w.push(currentWeek)
        currentWeek = []
      }
      
      if (current > today && currentWeek.length === 0) break;
      
      if (current > today) {
        // Pad the rest of the week if necessary
        currentWeek.push(null)
      } else {
        const dateStr = toLocalDateString(current)
        currentWeek.push({
          date: dateStr,
          count: activityMap.get(dateStr) || 0
        })
      }
      current.setDate(current.getDate() + 1)
    }
    
    return w
  }, [today, activityMap])

  const getColor = (count: number) => {
    if (count === 0) return "bg-[#282828] border-[#3e3e42]"
    if (count <= 2) return "bg-emerald-900 border-emerald-800"
    if (count <= 5) return "bg-emerald-700 border-emerald-600"
    if (count <= 10) return "bg-emerald-500 border-emerald-400"
    return "bg-emerald-400 border-emerald-300"
  }

  return (
    <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" /> Activity
        </h3>
        <div className="text-xs text-zinc-400">
          <span className="font-bold text-white">{submissions.length}</span> submissions in the last {days} days
          {/* DEBUG: Remove later */}
          <span className="ml-2 text-emerald-400">
            [Today ({toLocalDateString(today)}): {activityMap.get(toLocalDateString(today)) || 0}]
          </span>
        </div>
      </div>
      
      <div className="flex justify-start overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  title={day ? `${day.count} submissions on ${day.date}` : ""}
                  className={`w-3 h-3 rounded-[2px] border ${day ? getColor(day.count) : "bg-transparent border-transparent"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-zinc-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-[2px] border bg-[#282828] border-[#3e3e42]" />
          <div className="w-3 h-3 rounded-[2px] border bg-emerald-900 border-emerald-800" />
          <div className="w-3 h-3 rounded-[2px] border bg-emerald-700 border-emerald-600" />
          <div className="w-3 h-3 rounded-[2px] border bg-emerald-500 border-emerald-400" />
          <div className="w-3 h-3 rounded-[2px] border bg-emerald-400 border-emerald-300" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
