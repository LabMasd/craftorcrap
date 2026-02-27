'use client'

type TabType = 'votes' | 'saved' | 'submissions'

interface DashboardTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  counts: {
    votes: number
    saved: number
    submissions: number
  }
}

export default function DashboardTabs({ activeTab, onTabChange, counts }: DashboardTabsProps) {
  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'votes', label: 'My Votes', count: counts.votes },
    { id: 'saved', label: 'Saved', count: counts.saved },
    { id: 'submissions', label: 'My Submissions', count: counts.submissions },
  ]

  return (
    <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-white text-black'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-black/10' : 'bg-white/10'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
