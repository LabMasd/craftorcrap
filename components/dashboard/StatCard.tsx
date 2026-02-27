'use client'

interface StatCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  color?: 'default' | 'green' | 'red' | 'amber'
  darkMode?: boolean
}

export default function StatCard({ label, value, icon, color = 'default', darkMode = true }: StatCardProps) {
  const colorClasses = {
    default: darkMode ? 'text-white/90' : 'text-black/90',
    green: 'text-emerald-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
  }

  return (
    <div className={`rounded-xl p-4 ${darkMode ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className={darkMode ? 'text-white/40' : 'text-black/40'}>{icon}</span>}
        <span className={`text-xs uppercase tracking-wide ${darkMode ? 'text-white/40' : 'text-black/40'}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
    </div>
  )
}
