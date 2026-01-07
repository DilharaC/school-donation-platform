import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../css/index.css';
import axios from 'axios';
import { useEffect } from 'react';


// SVG Icons
const Search = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const Bell = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const User = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const LayoutDashboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
);

const Users = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const Heart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const TrendingUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);

const Settings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const FileText = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
  </svg>
);

const DollarSign = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

// Data
const campaigns = [
  { name: "New Library Fund", raised: 45000, goal: 50000, donors: 234 },
  { name: "Sports Equipment", raised: 12500, goal: 20000, donors: 98 },
  { name: "Science Lab Upgrade", raised: 28000, goal: 40000, donors: 156 },
];

const stats = [
  { label: "Total Donations", value: "$127,450", change: "+12.5%", icon: DollarSign },
  { label: "Total Donors", value: "1,248", change: "+8.2%", icon: Users },
  { label: "Active Campaigns", value: "23", change: "+3", icon: Heart },
  { label: "Avg. Donation", value: "$102", change: "+5.4%", icon: TrendingUp },
];






const navItems = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: Heart, label: "Campaigns" },
  { icon: Users, label: "Donors" },
  { icon: TrendingUp, label: "Analytics" },
  { icon: FileText, label: "Reports" },
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Settings" },
];

// Types
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface ProgressProps {
  value: number;
  className?: string;
}

interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'ghost';
  size?: 'default' | 'icon';
  className?: string;
  onClick?: () => void;
    disabled?: boolean;
}

interface InputProps {
  placeholder?: string;
  className?: string;
}

interface DropdownItem {
  label?: string;
  text?: string;
  separator?: boolean;
  onClick?: () => void;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
}

// Simple UI Components
const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Progress: React.FC<ProgressProps> = ({ value, className = "" }) => (
  <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${className}`}>
    <div 
      className="h-full bg-blue-600 transition-all duration-300"
      style={{ width: `${value}%` }}
    />
  </div>
);

const Avatar: React.FC<AvatarProps> = ({ children, className = "" }) => (
  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = "default", 
  size = "default", 
  className = "", 
  onClick 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
  const variantStyles = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "hover:bg-slate-100 text-slate-700",
  };
  const sizeStyles = {
    default: "px-4 py-2 text-sm",
    icon: "w-10 h-10",
  };
  
  return (
    <button 
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input: React.FC<InputProps> = ({ placeholder, className = "" }) => (
  <input
    type="text"
    placeholder={placeholder}
    className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  />
);

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
            {items.map((item, idx) => (
              item.separator ? (
                <div key={idx} className="border-t border-slate-200 my-1" />
              ) : item.label ? (
                <div key={idx} className="px-3 py-2 text-sm font-semibold text-slate-900">
                  {item.label}
                </div>
              ) : (
                <button
                  key={idx}
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {item.text}
                </button>
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [activeItem, setActiveItem] = useState("Overview");
  const [recentDonors, setRecentDonors] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const displayedCampaigns = activeCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const hasNextPage = currentPage * itemsPerPage < activeCampaigns.length;

 useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      // Fetch campaigns, donors, and chart data
      const [campaignRes, donorsRes, totalDonorsRes, chartRes] = await Promise.all([
        axios.get('http://localhost:8000/api/donation_requests?status=Approved'),
        axios.get('http://localhost:8000/api/recent-donors'),
        axios.get('http://localhost:8000/api/registered-donors'),

        axios.get('http://localhost:8000/api/donation-trends')
      ]);

      // Set campaigns
      setActiveCampaigns(campaignRes.data.projects || []);

      // Set recent donors
      const donors = donorsRes.data.map((d: any) => ({
        ...d,
        initials: d.name
          ? d.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
          : '?'
      }));
      setRecentDonors(donors);

      // Set chart data
      setChartData(chartRes.data || []);

      // Set stats
      const totalDonations = (campaignRes.data.projects || []).reduce(
        (sum: number, c: any) => sum + Number(c.amount_raised || 0),
        0
      );
      const totalDonors = totalDonorsRes.data.length;
      const activeCampaignCount = campaignRes.data.projects.length;
      const avgDonation = totalDonors > 0 ? totalDonations / totalDonors : 0;

      setStats([
        {
          label: "Total Donations",
          value: `$${totalDonations.toLocaleString()}`,
          change: "+12.5%", 
          icon: DollarSign
        },
        {
          label: "Total Donors",
          value: totalDonors,
          change: "+8.2%",
          icon: Users
        },
        {
          label: "Active Campaigns",
          value: activeCampaignCount,
          change: "+3",
          icon: Heart
        },
        {
          label: "Avg. Donation",
          value: `$${avgDonation.toFixed(2)}`,
          change: "+5.4%",
          icon: TrendingUp
        },
      ]);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  fetchDashboardData();

  const chartInterval = setInterval(fetchDashboardData, 15000); // refresh chart & stats

  return () => clearInterval(chartInterval);
}, []);


  return (
   <div className="flex h-screen bg-slate-50">



      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-40 flex flex-col">


        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <div className="w-5 h-5 text-white">
                  <Heart />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">School Donations</h2>
                <p className="text-xs text-slate-500">Admin Portal</p>
              </div>
            </div>
          </div>

     <nav className="flex flex-col p-4 space-y-0">




            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveItem(item.label)}
               className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
  activeItem === item.label
    ? "bg-blue-50 text-blue-700 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-blue-600 before:rounded-r"
    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
}`}

              >
              <div className="w-5 h-5 flex items-center justify-center">
  <item.icon />
</div>

                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      {/* Main Content */}
<div className="flex-1 flex flex-col overflow-hidden ml-64">

        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                  <Search />
                </div>
                <Input 
                  placeholder="Search donors or campaigns" 
                  className="pl-10 bg-slate-50 border-slate-200" 
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <div className="w-5 h-5">
                  <Bell />
                </div>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </Button>

              <DropdownMenu
                trigger={
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="w-4 h-4 text-white">
                        <User />
                      </div>
                    </div>
                  </Button>
                }
                items={[
                  { label: "Admin Account" },
                  { separator: true },
                  { text: "Profile" },
                  { text: "Settings" },
                  { separator: true },
                  { text: "Log out" },
                ]}
              />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
              <p className="text-slate-500 mt-1">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {stats.map((stat) => (
    <Card key={stat.label} className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <div className="w-5 h-5 text-blue-600">
              <stat.icon />
            </div>
          </div>
        </div>
        <span className="text-xs font-medium text-green-600">{stat.change}</span>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500">{stat.label}</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-900">{stat.value}</h3>
      </div>
    </Card>
  ))}
</div>


            {/* Charts and Lists Grid */}
            <div className="grid gap-6 lg:grid-cols-7">
              {/* Donation Chart */}
              <Card className="p-6 lg:col-span-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Donation Trends</h3>
                    <p className="text-sm text-slate-500">Monthly donation overview</p>
                  </div>
                  <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700">
                    <option>Last 6 months</option>
                    <option>Last year</option>
                    <option>All time</option>
                  </select>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillDonations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} stroke="#64748b" />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={8} 
                      tickFormatter={(value) => "$" + value / 1000 + "k"}
                      stroke="#64748b"
                    />
                   <Tooltip
  contentStyle={{ 
    backgroundColor: 'white', 
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 12px'
  }}
  formatter={(value: number | string | undefined) => {
    if (typeof value === "number") {
      return [`$${value.toLocaleString()}`, "Donations"];
    }
    return ["$0", "Donations"];
  }}
/>
                    <Area
                      type="monotone"
                      dataKey="donations"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#fillDonations)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

          {/* Campaigns List */}
<Card className="p-6 lg:col-span-3">
  {/* Card Title */}
  <div className="mb-4 flex items-center justify-between">
    <h3 className="text-lg font-semibold text-slate-900">Active Campaigns</h3>
    <p className="text-sm text-slate-500">Overview of ongoing campaigns</p>
  </div>
  <div className="space-y-6">
    {displayedCampaigns.map((campaign) => {
      const progress = (campaign.amount_raised / campaign.estimated_price) * 100;

      return (
        <div key={campaign.request_id}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-900">{campaign.request_title}</h4>
            <span className="text-sm text-slate-500">{campaign.category}</span>
          </div>
          
          <Progress value={progress} className="h-2 mb-2" />

          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-500">{campaign.quantity} items requested</span>
            <span className="font-medium text-slate-900">
              ${campaign.amount_raised.toLocaleString()} raised
            </span>
          </div>

          <p className="text-sm text-slate-500">{campaign.school_name}</p>
        </div>
      );
    })}

    {/* Pagination Buttons */}
    <div className="flex justify-between mt-4">
      {/* Previous Button */}
      <Button
        onClick={() => setCurrentPage(currentPage - 1)}
        variant="default"
        className="px-6"
        disabled={currentPage === 1} // disable if on first page
      >
        Previous
      </Button>

      {/* Next Button */}
      <Button
        onClick={() => setCurrentPage(currentPage + 1)}
        variant="default"
        className="px-6"
        disabled={!hasNextPage} // disable if no more pages
      >
        Next
      </Button>
    </div>
  </div>
</Card>

            </div>

            {/* Recent Donors */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Recent Donors</h3>
                  <p className="text-sm text-slate-500">Latest contributions</p>
                </div>
                <button className="text-sm text-blue-600 hover:underline font-medium">View all</button>
              </div>

             <div className="space-y-4">
  {recentDonors.map((donor, index) => (
    <div key={index} className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="bg-blue-50 text-blue-600 font-medium text-sm">
          {donor.initials}
        </Avatar>
        <div>
          <p className="font-medium text-slate-900">{donor.name}</p>
          <p className="text-sm text-slate-500">{donor.time}</p>
        </div>
      </div>
      <span className="font-semibold text-green-600">
        +${donor.amount}
      </span>
    </div>
  ))}
</div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;