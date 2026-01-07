"use client"

import { Card } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { month: "Jan", donations: 12400 },
  { month: "Feb", donations: 15800 },
  { month: "Mar", donations: 18200 },
  { month: "Apr", donations: 21500 },
  { month: "May", donations: 19800 },
  { month: "Jun", donations: 23400 },
]

const chartConfig = {
  donations: {
    label: "Donations",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function DonationChart() {
  return (
    <Card className="p-6 lg:col-span-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Donation Trends</h3>
          <p className="text-sm text-muted-foreground">Monthly donation overview</p>
        </div>
        <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background">
          <option>Last 6 months</option>
          <option>Last year</option>
          <option>All time</option>
        </select>
      </div>

      <ChartContainer config={chartConfig}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillDonations" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => "$" + value / 1000 + "k"}
            stroke="hsl(var(--muted-foreground))"
          />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={{ stroke: "hsl(var(--border))" }} />
          <Area
            type="monotone"
            dataKey="donations"
            stroke="hsl(var(--chart-1))"
            fillOpacity={1}
            fill="url(#fillDonations)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}
