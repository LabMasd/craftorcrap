interface MicrolinkResponse {
  status: string
  data: {
    title?: string
    description?: string
    image?: {
      url?: string
    }
  }
}

export interface UrlPreview {
  title: string | null
  thumbnail_url: string | null
  description: string | null
}

export async function fetchUrlPreview(url: string): Promise<UrlPreview> {
  const apiKey = process.env.MICROLINK_API_KEY
  const headers: HeadersInit = apiKey ? { 'x-api-key': apiKey } : {}

  const response = await fetch(
    `https://api.microlink.io?url=${encodeURIComponent(url)}`,
    { headers }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch URL preview')
  }

  const data: MicrolinkResponse = await response.json()

  return {
    title: data.data.title || null,
    thumbnail_url: data.data.image?.url || null,
    description: data.data.description || null,
  }
}
