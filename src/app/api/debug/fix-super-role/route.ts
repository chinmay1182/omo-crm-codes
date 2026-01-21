import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
    try {
        // 1. Define the complete Super Admin permissions
        const superPermissions = {
            admin: ["view_reports", "manage_agents", "manage_roles", "view_audit_logs"],
            forms: ["enable_disable", "view_all", "view_assigned", "create", "edit", "delete"],
            leads: ["enable_disable", "view_all", "view_assigned", "create", "edit", "delete", "transfer_lead", "proposal_create", "proposal_edit", "proposal_delete"],
            tasks: ["enable_disable", "view_all", "view_assigned", "create", "edit", "delete"],
            notes: ["enable_disable", "view_all", "view_assigned", "create", "edit", "delete"],
            teams: ["enable_disable", "view_all", "create", "edit", "delete"],
            tickets: ["enable_disable", "view_all", "view_assigned", "create", "edit", "delete", "transfer_ticket"],
            contacts: ["enable_disable", "view_all", "view_assigned", "create", "edit", "delete", "view_unmasked"],
            meetings: ["enable_disable", "view_all", "view_assigned", "create", "edit", "delete"],
            services: ["enable_disable", "view_all", "create", "edit", "delete"],
            scheduling: ["enable_disable", "view_all", "create", "edit", "delete"],
            whatsapp: ["reply_all", "reply_assigned", "view_all", "view_assigned"],
            voip: ["view_all_calls", "view_assigned_calls_only", "make_calls", "transfer_calls", "conference_calls"]
        };


        // 2. Update the 'super' role in the database
        const { data, error } = await supabase
            .from('roles')
            .update({ permissions: superPermissions })
            .eq('name', 'super')
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Super role updated successfully',
            updatedRole: data
        });

    } catch (error: any) {
        console.error('Error updating permissions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
