"use client"

interface StatusBadgeProps {
  running: boolean
}

export default function StatusBadge({ running }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="relative flex h-2 w-2">
        {running && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C8FF] opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            running ? "bg-[#00C8FF]" : "bg-red-500"
          }`}
        />
      </span>
      <span className={running ? "text-[#00C8FF]" : "text-red-400"}>
        {running ? "Agent running" : "Agent offline"}
      </span>
    </span>
  )
}
