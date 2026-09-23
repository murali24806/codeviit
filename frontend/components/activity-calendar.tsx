import { useMemo, useState, useRef } from "react"
import { Trophy } from "lucide-react"

interface ActivityCalendarProps {
  submissions: any[]
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function ActivityCalendar({ submissions }: ActivityCalendarProps) {
  // Generate last 150 days (approx 21 weeks)
  const days = 150
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const toLocalDateString = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }

  const { activityMap, totalUniqueCount } = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const overallUniqueQuestions = new Set<string>()

    submissions.forEach(sub => {
      const dateVal = sub.submittedAt || sub.createdAt || new Date().toISOString()
      const date = new Date(dateVal)
      const dateString = toLocalDateString(date)
      
      if (!map.has(dateString)) {
        map.set(dateString, new Set<string>())
      }
      
      const qId = sub.questionId || sub.exerciseId || sub.id
      if (qId) {
        map.get(dateString)!.add(qId)
        
        // Only count towards total if within the last `days` days
        const diffTime = Math.abs(today.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
        if (diffDays <= days) {
           overallUniqueQuestions.add(qId)
        }
      }
    })

    const countMap = new Map<string, number>()
    map.forEach((set, dateStr) => {
      countMap.set(dateStr, set.size)
    })

    return { activityMap: countMap, totalUniqueCount: overallUniqueQuestions.size }
  }, [submissions, days, today])

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
          count: activityMap.get(dateStr) || 0,
          dateObj: new Date(current)
        })
      }
      current.setDate(current.getDate() + 1)
    }
    
    return w
  }, [today, activityMap])

  // Get month labels positions
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, index) => {
      const firstDay = week.find(d => d !== null)
      if (firstDay) {
        const m = firstDay.dateObj.getMonth()
        if (m !== lastMonth) {
          labels.push({ month: MONTHS[m], weekIndex: index })
          lastMonth = m
        }
      }
    })
    return labels
  }, [weeks])

  const getColor = (count: number) => {
    if (count === 0) return "bg-[#282828] border-[#3e3e42]"
    if (count <= 2) return "bg-[#0e4429] border-[#0e4429]" // Darkest green
    if (count <= 5) return "bg-[#006d32] border-[#006d32]"
    if (count <= 10) return "bg-[#26a641] border-[#26a641]"
    return "bg-[#39d353] border-[#39d353]" // Brightest green
  }

  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string }>({
    visible: false, x: 0, y: 0, content: ""
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = (e: React.MouseEvent, day: any) => {
    if (!day || !containerRef.current) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    
    setTooltip({
      visible: true,
      x: rect.left - containerRect.left + (rect.width / 2),
      y: rect.top - containerRect.top - 8,
      content: `${day.count} ${day.count === 1 ? 'question' : 'questions'} solved on ${formatDateLabel(day.date)}`
    })
  }

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  return (
    <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-lg shadow-black/20" ref={containerRef}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" /> Activity
        </h3>
        <div className="text-xs text-zinc-400">
          <span className="font-bold text-white">{totalUniqueCount}</span> questions solved in the last {days} days
        </div>
      </div>
      
      <div className="relative">
        {tooltip.visible && (
          <div 
            className="absolute z-50 px-3 py-2 bg-[#2d2d2d] text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.content}
            {/* Tooltip arrow */}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#2d2d2d]"></div>
          </div>
        )}
        
        <div className="flex overflow-x-auto no-scrollbar pb-2">
          {/* Day Labels */}
          <div className="flex flex-col justify-between text-[10px] text-zinc-500 font-medium pr-2 mr-2 pt-5 h-[120px]">
            <span className="leading-[14px]"></span>
            <span className="leading-[14px]">Mon</span>
            <span className="leading-[14px]"></span>
            <span className="leading-[14px]">Wed</span>
            <span className="leading-[14px]"></span>
            <span className="leading-[14px]">Fri</span>
            <span className="leading-[14px]"></span>
          </div>

          <div className="flex flex-col min-w-max">
            {/* Month Labels */}
            <div className="flex relative h-5 text-[10px] text-zinc-500 font-medium mb-1">
              {monthLabels.map((lbl, idx) => (
                <div key={idx} className="absolute" style={{ left: `${lbl.weekIndex * 16}px` }}>
                  {lbl.month}
                </div>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      onMouseEnter={(e) => handleMouseEnter(e, day)}
                      onMouseLeave={handleMouseLeave}
                      className={`w-[13px] h-[13px] rounded-[3px] border ${day ? getColor(day.count) : "bg-transparent border-transparent"}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 text-[10px] text-zinc-500 font-medium">
        <span>Less</span>
        <div className="flex gap-[3px]">
          <div className="w-[13px] h-[13px] rounded-[3px] border bg-[#282828] border-[#3e3e42]" />
          <div className="w-[13px] h-[13px] rounded-[3px] border bg-[#0e4429] border-[#0e4429]" />
          <div className="w-[13px] h-[13px] rounded-[3px] border bg-[#006d32] border-[#006d32]" />
          <div className="w-[13px] h-[13px] rounded-[3px] border bg-[#26a641] border-[#26a641]" />
          <div className="w-[13px] h-[13px] rounded-[3px] border bg-[#39d353] border-[#39d353]" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
