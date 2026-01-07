"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { month: "Jan", before: 85, after: 92 },
  { month: "Feb", before: 88, after: 95 },
  { month: "Mar", before: 86, after: 97 },
  { month: "Apr", before: 89, after: 98 },
  { month: "May", before: 87, after: 99 },
  { month: "Jun", before: 90, after: 102 },
]

export function PolicyImpact() {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle>Policy Impact Analysis</CardTitle>
        <CardDescription>Donation growth after new tax incentive policy</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            before: {
              label: "Before Policy",
              color: "hsl(var(--chart-3))",
            },
            after: {
              label: "After Policy",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Line type="monotone" dataKey="before" stroke="var(--color-before)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="after" stroke="var(--color-after)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-background/50 border border-border">
            <p className="text-sm text-muted-foreground">Average Increase</p>
            <p className="text-2xl font-bold text-green-500">+14.2%</p>
          </div>
          <div className="p-4 rounded-lg bg-background/50 border border-border">
            <p className="text-sm text-muted-foreground">Policy Adoption</p>
            <p className="text-2xl font-bold text-cyan-500">92%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
