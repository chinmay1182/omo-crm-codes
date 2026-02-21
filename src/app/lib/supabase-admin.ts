
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tuftfxfuleznzrzgxjhj.supabase.co'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZnRmeGZ1bGV6bnpyemd4amhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU1ODA4NiwiZXhwIjoyMDg3MTM0MDg2fQ.H4lvW3v7c0Pc1c3evisn4HtLM_8S8ShmVt2OMEWGqrw';

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
