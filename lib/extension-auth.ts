import { getServiceClient } from '@/lib/supabase'

export interface ExtensionUser {
  userId: string
  token: string
}

/**
 * Verify an extension token and return the user ID
 */
export async function verifyExtensionToken(token: string): Promise<ExtensionUser | null> {
  if (!token || !token.startsWith('coc_')) {
    return null
  }

  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('extension_tokens')
    .select('user_id, token')
    .eq('token', token)
    .single()

  if (error || !data) {
    return null
  }

  return {
    userId: data.user_id,
    token: data.token,
  }
}

/**
 * Extract token from Authorization header
 */
export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null

  // Support both "Bearer token" and just "token"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return authHeader
}
