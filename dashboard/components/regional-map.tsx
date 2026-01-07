"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const regions = [
  { name: "North Region", donations: "$482M", schools: 442, growth: "+19%", status: "high" },
  { name: "South Region", donations: "$531M", schools: 520, growth: "+5.3%", status: "medium" },
  { name: "East Region", donations: "$410M", schools: 390, growth: "+12%", status: "high" },
  { name: "West Region", donations: "$298M", schools: 310, growth: "-2.1%", status: "low" },
  { name: "Central Region", donations: "$679M", schools: 691, growth: "+15%", status: "high" },
]

export function RegionalMap() {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle>Regional Performance</CardTitle>
        <CardDescription>Funding distribution across regions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {regions.map((region) => (
            <div
              key={region.name}
              className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{region.name}</p>
                  <Badge
                    variant={
                      region.status === "high" ? "default" : region.status === "medium" ? "secondary" : "destructive"
                    }
                    className="text-xs"
                  >
                    {region.status === "high"
                      ? "Performing"
                      : region.status === "medium"
                        ? "Average"
                        : "Needs Attention"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{region.schools} schools</span>
                  <span>•</span>
                  <span className={region.growth.startsWith("+") ? "text-green-500" : "text-red-500"}>
                    {region.growth} growth
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{region.donations}</p>
                <p className="text-xs text-muted-foreground">Total funding</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
