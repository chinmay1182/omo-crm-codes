import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function DELETE() {
    try {
        // Step 1: Delete all agent_roles entries
        const { error: rolesError } = await supabase
            .from('agent_roles')
            .delete()
            .neq('agent_id', 0); // Delete all

        if (rolesError) {
            console.error('Error deleting agent_roles:', rolesError);
        }

        // Step 2: Delete all agent_permissions entries
        const { error: permsError } = await supabase
            .from('agent_permissions')
            .delete()
            .neq('agent_id', 0); // Delete all

        if (permsError) {
            console.error('Error deleting agent_permissions:', permsError);
        }

        // Step 3: Delete all agents
        const { error: agentsError } = await supabase
            .from('agents')
            .delete()
            .neq('id', 0); // Delete all

        if (agentsError) {
            console.error('Error deleting agents:', agentsError);
            throw agentsError;
        }

        return NextResponse.json({
            success: true,
            message: 'All agents, roles, and permissions deleted successfully',
            note: 'You can now register a new Super Admin at /register'
        });

    } catch (error: any) {
        console.error('Error in cleanup:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete agents' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Just show current agent count
        const { data: agents, error } = await supabase
            .from('agents')
            .select('id, username, email, full_name, status');

        if (error) throw error;

        return NextResponse.json({
            count: agents?.length || 0,
            agents: agents || [],
            message: 'Use DELETE method to remove all agents'
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
