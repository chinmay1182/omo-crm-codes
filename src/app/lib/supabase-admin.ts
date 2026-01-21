
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk4Njc4MSwiZXhwIjoyMDgxNTYyNzgxfQ.PuO_4uvcV1yN0v3ZIHa8e1lEcPOQgnBaFjYof235bCk';

if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

// Admin client - bypasses RLS policies
// Only use this for server-side operations where you've already verified permissions
// Fallback to standard client if admin key is missing (requires RLS policies on DB side)
// or just return null to handle gracefully
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        db: {
            schema: 'public'
        }
    })
    : null; // Don't create invalid client

if (!supabaseAdmin) {
    console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY missing. Admin operations will fail.");
}

// Helper to check if admin client is available
export function hasAdminClient(): boolean {
    return supabaseAdmin !== null
}
