"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Menu, X, LogOut, Plus, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleNewProblem = () => {
    router.push("/editor")
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a] border-b border-[#3e3e42]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[50px]">

          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Terminal className="w-4 h-4 text-orange-500" />
              <span className="text-lg font-semibold text-white tracking-tight">CodeViit</span>
            </Link>

            <div className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link href="/exercises" className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-[#282828] rounded transition-colors">
                Problems
              </Link>
              <Link href="/dashboard" className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-[#282828] rounded transition-colors">
                Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin" className="px-3 py-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded transition-colors">
                  Admin Panel
                </Link>
              )}
            </div>
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-semibold rounded bg-[#282828] border border-[#3e3e42]">
              Premium
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#1a1a1a] hover:opacity-90 transition-opacity">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#282828] border-[#3e3e42] text-white"
              >
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#3e3e42] bg-[#1a1a1a]">
            <div className="flex flex-col gap-2 px-2">
              <Link 
                href="/exercises" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-400 hover:text-white px-3 py-2 text-sm font-medium rounded hover:bg-[#282828]"
              >
                Problems
              </Link>
              <Link 
                href="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-400 hover:text-white px-3 py-2 text-sm font-medium rounded hover:bg-[#282828]"
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-orange-400 hover:text-orange-300 px-3 py-2 text-sm font-medium rounded hover:bg-orange-500/10"
                >
                  Admin Panel
                </Link>
              )}
              <div className="h-px bg-[#3e3e42] my-2" />
              <button
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white px-3 py-2 text-sm font-medium rounded hover:bg-[#282828] text-left flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
