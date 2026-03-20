"use client"

import useSWR from "swr"
import type { AgentStatus } from "@/types"
import StatusBadge from "@/components/StatusBadge"

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("offline")
    return res.json()
  })

export default function NavbarStatus() {
  const { data, error } = useSWR<AgentStatus>("/api/status", fetcher, {
    refreshInterval: 5000,
  })

  if (error || !data) {
    return <StatusBadge running={false} />
  }

  return (
    <div className="flex items-center gap-3">
      <StatusBadge running={data.running} />
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
    </div>
  )
}
