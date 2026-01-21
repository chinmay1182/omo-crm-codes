export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            agents: {
                Row: {
                    id: number
                    username: string
                    password?: string
                    email: string | null
                    full_name: string | null
                    status: string
                    last_login: string | null
                    created_by: number | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    username: string
                    password?: string
                    email?: string | null
                    full_name?: string | null
                    status?: string
                    last_login?: string | null
                    created_by?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    username?: string
                    password?: string
                    email?: string | null
                    full_name?: string | null
                    status?: string
                    last_login?: string | null
                    created_by?: number | null
                    created_at?: string
                }
            }
            agent_roles: {
                Row: {
                    id: number
                    agent_id: number
                    role_id: number
                    assigned_by: number | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    agent_id: number
                    role_id: number
                    assigned_by?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    agent_id?: number
                    role_id?: number
                    assigned_by?: number | null
                    created_at?: string
                }
            }
            agent_permissions: {
                Row: {
                    id: number
                    agent_id: number
                    service_type: string
                    permission_type: string
                    granted_by: number | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    agent_id: number
                    service_type: string
                    permission_type: string
                    granted_by?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    agent_id?: number
                    service_type?: string
                    permission_type?: string
                    granted_by?: number | null
                    created_at?: string
                }
            }
            cli_numbers: {
                Row: {
                    id: string
                    number: string
                    display_name: string
                    type: string
                    is_default: boolean
                    is_active: boolean
                    aparty: string | null
                    auth_username: string | null
                    auth_password?: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    number: string
                    display_name: string
                    type?: string
                    is_default?: boolean
                    is_active?: boolean
                    aparty?: string | null
                    auth_username?: string | null
                    auth_password?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    number?: string
                    display_name?: string
                    type?: string
                    is_default?: boolean
                    is_active?: boolean
                    aparty?: string | null
                    auth_username?: string | null
                    auth_password?: string | null
                    created_at?: string
                }
            }
            call_logs: {
                Row: {
                    id: number
                    reference_id: string
                    cli: string | null
                    a_party: string | null
                    b_party: string | null
                    status: string | null
                    timestamp: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    reference_id: string
                    cli?: string | null
                    a_party?: string | null
                    b_party?: string | null
                    status?: string | null
                    timestamp?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    reference_id?: string
                    cli?: string | null
                    a_party?: string | null
                    b_party?: string | null
                    status?: string | null
                    timestamp?: string
                    updated_at?: string
                }
            }
            instant_replies: {
                Row: {
                    id: number
                    title: string
                    message: string
                    category: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    title: string
                    message: string
                    category?: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    title?: string
                    message?: string
                    category?: string
                    created_at?: string
                }
            }
        }
    }
}
