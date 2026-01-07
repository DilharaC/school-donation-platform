"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Award } from "lucide-react"

const topSchools = [
  { rank: 1, name: "Central High School", location: "Central Region", donations: "$2.3M", donors: 1842, trend: "+23%" },
  { rank: 2, name: "North Elementary", location: "North Region", donations: "$1.9M", donors: 1567, trend: "+18%" },
  { rank: 3, name: "East Academy", location: "East Region", donations: "$1.7M", donors: 1432, trend: "+21%" },
  { rank: 4, name: "South Technical", location: "South Region", donations: "$1.5M", donors: 1289, trend: "+15%" },
  { rank: 5, name: "West College Prep", location: "West Region", donations: "$1.4M", donors: 1156, trend: "+12%" },
]

export function SchoolRankings() {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Performing Schools</CardTitle>
            <CardDescription>Schools with highest donation performance this quarter</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Award className="w-3 h-3" />
            National Leaders
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topSchools.map((school) => (
            <div
              key={school.rank}
              className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border hover:bg-background/80 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                  school.rank === 1
                    ? "bg-yellow-500/20 text-yellow-500"
                    : school.rank === 2
                      ? "bg-gray-400/20 text-gray-400"
                      : school.rank === 3
                        ? "bg-orange-500/20 text-orange-500"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {school.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{school.name}</p>
                <p className="text-xs text-muted-foreground">{school.location}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{school.donations}</p>
                <p className="text-xs text-muted-foreground">{school.donors} donors</p>
              </div>
              <div className="flex items-center gap-1 text-green-500 min-w-[60px]">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{school.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
