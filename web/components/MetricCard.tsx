import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  subColor?: "green" | "amber" | "default"
}

const subColorClass = {
  green: "text-[#00C8FF]",
  amber: "text-[#EF9F27]",
  default: "text-zinc-400",
}

export default function MetricCard({ label, value, sub, subColor = "default" }: MetricCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && (
          <p className={`text-xs mt-1 ${subColorClass[subColor]}`}>{sub}</p>
        )}
      </CardContent>
    </Card>
  )
}
