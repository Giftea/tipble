import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatHash, formatTime, getExplorerUrl } from "@/lib/utils"
import type { TipEvent } from "@/types"

interface TipTableProps {
  tips: TipEvent[]
  network: string
}

export default function TipTable({ tips, network }: TipTableProps) {
  if (tips.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-zinc-400 text-sm">
        No tips yet
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400 w-28">Time</TableHead>
          <TableHead className="text-zinc-400">Event</TableHead>
          <TableHead className="text-zinc-400 w-32">Amount</TableHead>
          <TableHead className="text-zinc-400 w-36">Tx Hash</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tips.map((tip, i) => (
          <TableRow key={tip.id} className="border-zinc-800 hover:bg-zinc-800/40">
            <TableCell className="font-mono text-xs text-zinc-400">
              {formatTime(tip.timestamp)}
            </TableCell>
            <TableCell
              className={`text-sm text-white ${
                i === 0 ? "border-l-2 border-l-[#00C8FF] pl-3" : ""
              }`}
            >
              {tip.reason}
            </TableCell>
            <TableCell className="font-mono text-sm text-[#00C8FF]">
              {tip.amount} {tip.asset}
            </TableCell>
            <TableCell className="font-mono text-xs text-zinc-400">
              <a
                href={getExplorerUrl(tip.txHash, network)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {formatHash(tip.txHash)}
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
