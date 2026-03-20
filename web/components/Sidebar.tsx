"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import useSWR from "swr"
import { LayoutDashboard, Sliders, History, Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { AgentStatus } from "@/types"

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Rules", href: "/rules", icon: Sliders },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
]

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("offline")
    return r.json()
  })

export default function Sidebar() {
  const pathname = usePathname()
  const { data } = useSWR<AgentStatus>("/api/status", fetcher, {
    refreshInterval: 5000,
  })

  return (
    <aside className="w-16 md:w-60 flex-shrink-0 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 md:px-6 py-5 border-b border-zinc-800 flex flex-col items-center md:items-start">
        <p className="text-white font-bold text-lg leading-none">
          <span>🦞</span>
          <span className="hidden md:inline"> Tipble</span>
        </p>
        <p className="hidden md:block text-zinc-500 text-xs mt-1">v1.0.0</p>
      </div>

      {/* Navigation */}
      <nav className="px-2 md:px-3 py-3 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors border-l-[3px] ${
                isActive
                  ? "bg-zinc-800 text-white border-l-[#5dcaa5]"
                  : "bg-transparent text-zinc-400 hover:bg-zinc-800/50 border-transparent hover:text-zinc-200"
              } justify-center md:justify-start`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Status card — pushed to bottom of nav area */}
      <div className="flex-1 flex items-end px-2 md:px-3 pb-3">
        <div className="w-full bg-zinc-800 rounded-md p-3 space-y-2">
          {/* Running indicator */}
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              {data?.running && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5dcaa5] opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  data?.running ? "bg-[#5dcaa5]" : "bg-red-500"
                }`}
              />
            </span>
            <span
              className={`hidden md:inline text-xs font-medium ${
                data?.running ? "text-[#5dcaa5]" : "text-red-400"
              }`}
            >
              {data?.running ? "Running" : "Offline"}
            </span>
          </div>

          {/* Network + demo badges */}
          {data && (
            <div className="hidden md:flex flex-wrap gap-1.5">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full border"
                style={
                  data.network === "sepolia"
                    ? {
                        color: "#5dcaa5",
                        borderColor: "#5dcaa5",
                        backgroundColor: "rgba(93,202,165,0.08)",
                      }
                    : {
                        color: "#EF9F27",
                        borderColor: "#EF9F27",
                        backgroundColor: "rgba(239,159,39,0.08)",
                      }
                }
              >
                {data.network}
              </span>
              {data.demoMode && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-zinc-600 text-zinc-500">
                  demo
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-4 hidden md:block">
        <p className="text-zinc-600 text-[11px]">Powered by</p>
        <p className="text-white text-xs font-bold mt-0.5">
          <span className="text-[#5dcaa5]">₮</span> Tether WDK
        </p>
      </div>
    </aside>
  )
}
