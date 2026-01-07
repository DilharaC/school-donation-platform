import { Card } from "@/components/ui/card"
import { DollarSign, Users, TrendingUp, Heart } from "lucide-react"

const stats = [
  {
    label: "Total Donations",
    value: "$127,450",
    change: "+12.5%",
    icon: DollarSign,
    positive: true,
  },
  {
    label: "Total Donors",
    value: "1,248",
    change: "+8.2%",
    icon: Users,
    positive: true,
  },
  {
    label: "Active Campaigns",
    value: "23",
    change: "+3",
    icon: Heart,
    positive: true,
  },
  {
    label: "Avg. Donation",
    value: "$102",
    change: "+5.4%",
    icon: TrendingUp,
    positive: true,
  },
]

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <span className="text-xs font-medium text-accent">{stat.change}</span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
          </div>
        </Card>
      ))}
    </div>
  )
}
