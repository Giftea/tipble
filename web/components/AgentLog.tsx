import { ScrollArea } from "@/components/ui/scroll-area"
import { formatTime } from "@/lib/utils"
import type { TipEvent } from "@/types"

interface AgentLogProps {
  tips: TipEvent[]
}

export default function AgentLog({ tips }: AgentLogProps) {
  return (
    <ScrollArea className="h-[200px] rounded-md border border-zinc-800 bg-zinc-950 p-3">
      {tips.length === 0 ? (
        <p className="font-mono text-xs text-zinc-500">Waiting for events...</p>
      ) : (
        <div className="flex flex-col gap-1">
          {tips.map((tip) => (
            <p key={tip.id} className="font-mono text-xs text-[#00C8FF]">
              [{formatTime(tip.timestamp)}] ✅ {tip.amount} {tip.asset} → {tip.reason}{" "}
              (confidence: {tip.confidence.toFixed(2)})
            </p>
          ))}
        </div>
      )}
    </ScrollArea>
  )
}
