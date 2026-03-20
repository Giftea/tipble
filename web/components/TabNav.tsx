"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { label: "Dashboard", href: "/" },
  { label: "Rules", href: "/rules" },
  { label: "History", href: "/history" },
  { label: "Settings", href: "/settings" },
]

export default function TabNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 px-6">
      {tabs.map(({ label, href }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              isActive
                ? "border-[#5dcaa5] text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
