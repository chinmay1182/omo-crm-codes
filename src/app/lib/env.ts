// Environment Variable Validation
// Use this to ensure all required variables are present on startup

const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
];

interface EnvConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
}

export function validateEnv(): EnvConfig {
    const missing = requiredEnvVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
    };
}

// Optional: Run validation immediately if this file is imported
// validateEnv();
