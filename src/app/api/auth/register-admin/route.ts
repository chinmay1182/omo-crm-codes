import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import bcrypt from 'bcryptjs';
import { PERMISSION_LEVELS } from '@/app/lib/roleDefaults';

export async function POST(request: Request) {
    try {
        const { username, email, password, full_name, phone_number } = await request.json();

        // Validation
        if (!username || !email || !password || !full_name) {
            return NextResponse.json(
                { error: 'Username, email, password, and full name are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Check if this is the first agent (if yes, allow registration)
        const { data: existingAgents, error: countError } = await supabase
            .from('agents')
            .select('id', { count: 'exact', head: true });

        if (countError) throw countError;

        // Only allow registration if no agents exist yet
        // This prevents unauthorized registrations
        const agentCount = existingAgents?.length || 0;

        // For security, you can comment out this check if you want to allow multiple registrations
        // Or add a secret key requirement
        if (agentCount > 0) {
            return NextResponse.json(
                { error: 'Registration is disabled. Please contact your administrator.' },
                { status: 403 }
            );
        }

        // Check if username already exists
        const { data: existingUser } = await supabase
            .from('agents')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: 'Username already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create agent
        const { data: newAgent, error: agentError } = await supabase
            .from('agents')
            .insert({
                username,
                email,
                password: hashedPassword,
                full_name,
                phone_number: phone_number || null,
                status: 'active'
            })
            .select()
            .single();

        if (agentError) throw agentError;

        // Get or create 'super' role
        let { data: superRole, error: roleError } = await supabase
            .from('roles')
            .select('id, name')
            .ilike('name', 'super')
            .single();

        // If super role doesn't exist, create it
        if (!superRole) {
            const { data: createdRole, error: createRoleError } = await supabase
                .from('roles')
                .insert({
                    name: 'super',
                    permissions: PERMISSION_LEVELS.super
                })
                .select()
                .single();

            if (createRoleError) throw createRoleError;
            superRole = createdRole;
        }

        // Ensure superRole exists
        if (!superRole) {
            throw new Error('Failed to create or fetch super role');
        }

        // Assign super role to new agent
        const { error: roleAssignError } = await supabase
            .from('agent_roles')
            .insert({
                agent_id: newAgent.id,
                role_id: superRole.id
            });

        if (roleAssignError) throw roleAssignError;

        // Update the role's permissions to match latest code defaults
        const { error: updateRoleError } = await supabase
            .from('roles')
            .update({ permissions: PERMISSION_LEVELS.super })
            .eq('id', superRole.id);

        if (updateRoleError) {
            console.warn('Could not update role permissions:', updateRoleError);
        }

        // NOTE: We don't insert individual permissions because:
        // 1. The database CHECK constraint only allows old service types
        // 2. Role-based permissions are sufficient
        // 3. Login API merges code defaults with role permissions

        return NextResponse.json({
            success: true,
            message: 'Super Admin account created successfully',
            agent: {
                id: newAgent.id,
                username: newAgent.username,
                email: newAgent.email,
                full_name: newAgent.full_name
            }
        });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create account' },
            { status: 500 }
        );
    }
}
