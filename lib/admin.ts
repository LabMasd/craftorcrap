import { auth, currentUser } from '@clerk/nextjs/server'

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return false

  const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
  return userEmail === adminEmail
}

export async function requireAdmin(): Promise<{ authorized: boolean; userId?: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { authorized: false }
  }

  const admin = await isAdmin()
  return { authorized: admin, userId }
}
