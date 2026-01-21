
import { createClient } from '@supabase/supabase-js'

// TODO: Move these to environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tztohhabbvoftwaxgues.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dG9oaGFiYnZvZnR3YXhndWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODY3ODEsImV4cCI6MjA4MTU2Mjc4MX0.3u9B6t8iKye_58zg77aCDvm9BBEAcXgVcB7jpT0zRJ4'

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Server-side usage mainly, avoids unnecessary local storage ops
    },
    db: {
        schema: 'public'
    }
})
