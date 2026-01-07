import { MinisterStats } from "@/components/minister-stats"
import { RegionalMap } from "@/components/regional-map"
import { SchoolRankings } from "@/components/school-rankings"
import { PolicyImpact } from "@/components/policy-impact"
import { MinisterSidebar } from "@/components/minister-sidebar"
import { MinisterHeader } from "@/components/minister-header"

export default function MinisterDashboard() {
  return (
    <div className="flex h-screen bg-background">
      <MinisterSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MinisterHeader />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-balance">Government Dashboard</h1>
              <p className="text-muted-foreground mt-2">National education funding insights and regional performance</p>
            </div>

            <MinisterStats />

            <div className="grid gap-6 lg:grid-cols-2">
              <RegionalMap />
              <PolicyImpact />
            </div>

            <SchoolRankings />
          </div>
        </main>
      </div>
    </div>
  )
}
