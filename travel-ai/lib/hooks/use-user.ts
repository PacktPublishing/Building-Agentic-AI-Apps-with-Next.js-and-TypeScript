import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export function useUser() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [dbUser, setDbUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function syncUser() {
      if (!authUser) {
        setDbUser(null)
        setLoading(false)
        return
      }

      try {
        // Vérifier si l'utilisateur existe dans notre DB
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, authUser.email!))
          .limit(1)

        if (existingUsers.length > 0) {
          setDbUser(existingUsers[0])
        } else {
          // Créer l'utilisateur dans notre DB
          const newUser = await db
            .insert(users)
            .values({
              email: authUser.email!,
              name: authUser.user_metadata?.name || null,
            })
            .returning()

          setDbUser(newUser[0])
        }
      } catch (error) {
        console.error('Erreur lors de la synchronisation utilisateur:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      syncUser()
    }
  }, [authUser, authLoading])

  return {
    user: dbUser,
    authUser,
    loading: loading || authLoading,
  }
}
