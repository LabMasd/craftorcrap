'use client'

type TabType = 'votes' | 'saved' | 'boards' | 'submissions'

interface DashboardTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  counts: {
    votes: number
    saved: number
    boards: number
    submissions: number
  }
  darkMode?: boolean
}

export default function DashboardTabs({ activeTab, onTabChange, counts, darkMode = true }: DashboardTabsProps) {
  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'boards', label: 'Boards', count: counts.boards },
    { id: 'saved', label: 'All Saved', count: counts.saved },
    { id: 'votes', label: 'Votes', count: counts.votes },
    { id: 'submissions', label: 'Submissions', count: counts.submissions },
  ]

  return (
    <div className={`flex gap-1 p-1 rounded-lg ${darkMode ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === tab.id
              ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
              : darkMode ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-black/60 hover:text-black hover:bg-black/5'
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? darkMode ? 'bg-black/10' : 'bg-white/20'
                  : darkMode ? 'bg-white/10' : 'bg-black/10'
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
