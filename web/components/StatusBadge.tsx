"use client"

interface StatusBadgeProps {
  running: boolean
}

export default function StatusBadge({ running }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="relative flex h-2 w-2">
        {running && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5dcaa5] opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            running ? "bg-[#5dcaa5]" : "bg-red-500"
          }`}
        />
      </span>
      <span className={running ? "text-[#5dcaa5]" : "text-red-400"}>
        {running ? "Agent running" : "Agent offline"}
      </span>
    </span>
  )
}
