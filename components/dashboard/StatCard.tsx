'use client'

interface StatCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  color?: 'default' | 'green' | 'red' | 'amber'
}

export default function StatCard({ label, value, icon, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-white/90',
    green: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
  }

  return (
    <div className="bg-white/[0.03] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-white/40">{icon}</span>}
        <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
    </div>
  )
}
