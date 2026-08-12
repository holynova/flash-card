import { withSupabase } from 'npm:@supabase/server'
import type { Database } from '../_shared/database.types.ts'

export default {
  fetch: withSupabase<Database>({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') return Response.json({ message: 'Method not allowed' }, { status: 405 })

    const userId = context.userClaims?.id
    const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!userId || !accessToken) return Response.json({ message: 'Unauthorized' }, { status: 401 })

    const { error: revokeError } = await context.supabaseAdmin.auth.admin.signOut(accessToken, 'global')
    if (revokeError) return Response.json({ message: revokeError.message }, { status: 400 })

    const { error: deleteError } = await context.supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) return Response.json({ message: deleteError.message }, { status: 400 })
    return Response.json({ deleted: true })
  })
}
