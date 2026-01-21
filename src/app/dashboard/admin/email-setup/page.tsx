'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { createBrowserClient } from '@supabase/ssr';


import { Suspense } from 'react';

function EmailSetupContent() {
    const [agents, setAgents] = useState<any[]>([]);
    const [assignedEmails, setAssignedEmails] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        appPassword: '',
        agentId: '',
        agentName: ''
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key'
    );

    useEffect(() => {
        fetchAgents();
        fetchAssignedEmails();
    }, []);

    const fetchAgents = async () => {
        // This assumes you have a public 'users' or 'profiles' table syncing with auth.users
        // Or we fetch from a custom API endpoint. Using Supabase query for now.
        const { data, error } = await supabase
            .from('profiles') // Assuming a profiles table exists
            .select('id, full_name, role')
            .eq('role', 'agent'); // Filter by agent role if applicable

        if (error) {
            console.error('Error fetching agents:', error);
            // Fallback or handle error
        } else {
            setAgents(data || []);
        }
    };

    const fetchAssignedEmails = async () => {
        const { data, error } = await supabase
            .from('workspace_emails')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching emails:', error);
        } else {
            setAssignedEmails(data || []);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.appPassword || !formData.agentId) {
            toast.error('Please fill all fields');
            return;
        }

        // Validate email
        if (!formData.email.endsWith('@gmail.com')) {
            // Optional warning, but usually workspace emails are Gmail/G-Suite
        }

        setIsLoading(true);
        try {
            const selectedAgent = agents.find(a => a.id === formData.agentId);

            const { error } = await supabase
                .from('workspace_emails')
                .insert({
                    email: formData.email,
                    app_password: formData.appPassword,
                    assigned_agent_id: formData.agentId,
                    agent_name: selectedAgent?.full_name || 'Unknown Agent'
                });

            if (error) throw error;

            toast.success('Email Authority Assigned Successfully');
            setFormData({ email: '', appPassword: '', agentId: '', agentName: '' });
            fetchAssignedEmails();
        } catch (error: any) {
            console.error('Error assigning email:', error);
            toast.error(error.message || 'Failed to assign email');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this email assignment?')) return;

        try {
            const { error } = await supabase
                .from('workspace_emails')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Assignment removed');
            fetchAssignedEmails();
        } catch (error) {
            toast.error('Failed to remove assignment');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: '"Open Sauce One", sans-serif' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
                Workspace Email Setup (Authority)
            </h1>

            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#334155' }}>Assign New Email</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>Gmail Address</label>
                            <input
                                type="email"
                                placeholder="ex: support@gmail.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>App Password</label>
                            <input
                                type="password"
                                placeholder="16-digit app password"
                                value={formData.appPassword}
                                onChange={e => setFormData({ ...formData, appPassword: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            />
                            <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                <a href="https://myaccount.google.com/apppasswords" target="_blank" style={{ color: '#15426d' }}>Generate App Password here</a>
                            </small>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>Assign to Agent</label>
                        <select
                            value={formData.agentId}
                            onChange={e => setFormData({ ...formData, agentId: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                        >
                            <option value="">Select an Agent</option>
                            {agents.length > 0 ? (
                                agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.full_name || agent.email || 'Unnamed Agent'} ({agent.role || 'Agent'})
                                    </option>
                                ))
                            ) : (
                                <option disabled>Loading agents or no agents found...</option>
                            )}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            backgroundColor: '#15426d',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.8 : 1
                        }}
                    >
                        {isLoading ? 'Assigning...' : 'Assign Email Authority'}
                    </button>
                </form>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Active Email Assignments</h3>
                </div>
                <div>
                    {assignedEmails.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No Workspace Emails configured yet.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                                    <th style={{ padding: '12px 24px', fontWeight: '500' }}>Email</th>
                                    <th style={{ padding: '12px 24px', fontWeight: '500' }}>Assigned To</th>
                                    <th style={{ padding: '12px 24px', fontWeight: '500' }}>Status</th>
                                    <th style={{ padding: '12px 24px', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignedEmails.map(item => (
                                    <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 24px', color: '#1e293b', fontWeight: '500' }}>{item.email}</td>
                                        <td style={{ padding: '12px 24px', color: '#475569' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <i className="fa-light fa-user-circle"></i>
                                                {item.agent_name || 'Agent ID: ' + item.assigned_agent_id?.substring(0, 8)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span style={{
                                                backgroundColor: '#dcfce7',
                                                color: '#166534',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}>
                                                Active
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                title="Revoke Authority"
                                            >
                                                <i className="fa-light fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function EmailSetupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EmailSetupContent />
        </Suspense>
    );
}
