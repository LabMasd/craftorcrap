'use client'

import { CATEGORIES, type Category, type SortOption } from '@/types'

interface FeedFiltersProps {
  selectedCategory: Category | 'All'
  sortBy: SortOption
  onCategoryChange: (category: Category | 'All') => void
  onSortChange: (sort: SortOption) => void
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'most_voted', label: 'Most Voted' },
  { value: 'most_recent', label: 'Recent' },
  { value: 'most_craft', label: 'Top Craft' },
  { value: 'most_crap', label: 'Top Crap' },
]

export default function FeedFilters({
  selectedCategory,
  sortBy,
  onCategoryChange,
  onSortChange,
}: FeedFiltersProps) {
  const allCategories: (Category | 'All')[] = ['All', ...CATEGORIES]

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-10">
      <div className="flex flex-wrap gap-1.5">
        {allCategories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-white text-black'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="sm:ml-auto">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="bg-white/5 text-white/60 px-4 py-2 text-xs font-medium rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer appearance-none pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-black">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
