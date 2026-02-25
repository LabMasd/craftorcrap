'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CATEGORIES, type Category } from '@/types'

interface Preview {
  title: string | null
  thumbnail_url: string | null
  description: string | null
}

interface SubmitFormProps {
  darkMode?: boolean
}

export default function SubmitForm({ darkMode = true }: SubmitFormProps) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<Category>('Other')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  let domain = ''
  if (url) {
    try {
      domain = new URL(url).hostname.replace('www.', '')
    } catch {
      domain = ''
    }
  }

  async function handleFetchPreview() {
    if (!url) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch preview')
      }

      const data = await response.json()
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preview')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!url || !preview) return

    if (!supabase) {
      router.push('/')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('url', url)
        .single()

      if (existing) {
        setError('This URL has already been submitted')
        setSubmitting(false)
        return
      }

      const { error: insertError } = await supabase.from('submissions').insert({
        url,
        title: preview.title,
        thumbnail_url: preview.thumbnail_url,
        category,
        submitted_by: null,
      })

      if (insertError) throw insertError

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <label className={`block text-xs font-medium mb-3 uppercase tracking-wider ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          URL
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={`flex-1 border-0 rounded-xl px-5 py-4 focus:outline-none focus:ring-1 ${
              darkMode
                ? 'bg-white/5 text-white placeholder-white/20 focus:ring-white/20'
                : 'bg-black/5 text-black placeholder-black/20 focus:ring-black/20'
            }`}
          />
          <button
            onClick={handleFetchPreview}
            disabled={!url || loading}
            className={`px-6 py-4 rounded-xl font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
              darkMode
                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                : 'bg-black/10 text-black/70 hover:bg-black/15'
            }`}
          >
            {loading ? '...' : 'Preview'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {preview && (
        <div className="mb-8">
          <div className={`rounded-2xl overflow-hidden ${
            darkMode
              ? 'bg-white/[0.03] border border-white/[0.06]'
              : 'bg-black/[0.02] border border-black/[0.06]'
          }`}>
            <div className={`aspect-[16/10] relative overflow-hidden ${darkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
              {preview.thumbnail_url ? (
                <img
                  src={preview.thumbnail_url}
                  alt={preview.title || 'Preview'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-sm ${darkMode ? 'text-white/20' : 'text-black/20'}`}>
                  No preview available
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className={`font-medium text-[15px] leading-snug mb-1 ${darkMode ? 'text-white/90' : 'text-black/90'}`}>
                {preview.title || domain}
              </h3>
              <p className={`text-xs ${darkMode ? 'text-white/30' : 'text-black/30'}`}>{domain}</p>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <>
          <div className="mb-8">
            <label className={`block text-xs font-medium mb-3 uppercase tracking-wider ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2.5 text-xs font-medium rounded-full transition-all duration-200 ${
                    category === cat
                      ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                      : darkMode ? 'bg-white/5 text-white/40 hover:text-white/70' : 'bg-black/5 text-black/40 hover:text-black/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-4 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              darkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </>
      )}
    </div>
  )
}
