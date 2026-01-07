import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const campaigns = [
  {
    name: "New Library Fund",
    raised: 45000,
    goal: 50000,
    donors: 234,
  },
  {
    name: "Sports Equipment",
    raised: 12500,
    goal: 20000,
    donors: 98,
  },
  {
    name: "Science Lab Upgrade",
    raised: 28000,
    goal: 40000,
    donors: 156,
  },
]

export function CampaignsList() {
  return (
    <Card className="p-6 lg:col-span-3">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Active Campaigns</h3>
        <p className="text-sm text-muted-foreground">Top performing campaigns</p>
      </div>

      <div className="space-y-6">
        {campaigns.map((campaign) => {
          const progress = (campaign.raised / campaign.goal) * 100

          return (
            <div key={campaign.name}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{campaign.name}</h4>
                <span className="text-sm text-muted-foreground">{campaign.donors} donors</span>
              </div>
              <Progress value={progress} className="h-2 mb-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {"$"}
                  {campaign.raised.toLocaleString()} raised
                </span>
                <span className="font-medium">
                  {"$"}
                  {campaign.goal.toLocaleString()} goal
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
