import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const donors = [
  { name: "Sarah Johnson", amount: 500, time: "2 hours ago", initials: "SJ" },
  { name: "Michael Chen", amount: 250, time: "5 hours ago", initials: "MC" },
  { name: "Emily Rodriguez", amount: 1000, time: "8 hours ago", initials: "ER" },
  { name: "David Kim", amount: 150, time: "12 hours ago", initials: "DK" },
  { name: "Jessica Williams", amount: 300, time: "1 day ago", initials: "JW" },
  { name: "Robert Brown", amount: 750, time: "1 day ago", initials: "RB" },
]

export function RecentDonors() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Recent Donors</h3>
          <p className="text-sm text-muted-foreground">Latest contributions</p>
        </div>
        <button className="text-sm text-primary hover:underline font-medium">View all</button>
      </div>

      <div className="space-y-4">
        {donors.map((donor) => (
          <div key={donor.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary font-medium">{donor.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{donor.name}</p>
                <p className="text-sm text-muted-foreground">{donor.time}</p>
              </div>
            </div>
            <span className="font-semibold text-accent">
              +{"$"}
              {donor.amount}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
