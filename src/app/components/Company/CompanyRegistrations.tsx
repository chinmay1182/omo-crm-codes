'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

type Registration = {
    id: string;
    registration_name: string;
    registration_number: string;
    start_date?: string;
    end_date?: string;
    created_at: string;
};

export default function CompanyRegistrations({ companyId }: { companyId: string }) {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newNumber, setNewNumber] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchRegistrations();
    }, [companyId]);

    const fetchRegistrations = async () => {
        try {
            const res = await fetch(`/api/companies/${companyId}/registrations`);
            if (res.ok) {
                const data = await res.json();
                setRegistrations(data);
            }
        } catch (e) {
            console.error('Error fetching registrations:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newName.trim() || !newNumber.trim()) {
            toast.error('Registration Name and Number are required');
            return;
        }

        setIsAdding(true);
        try {
            const res = await fetch(`/api/companies/${companyId}/registrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_name: newName,
                    registration_number: newNumber,
                    start_date: newStartDate || null,
                    end_date: newEndDate || null
                }),
            });

            if (res.ok) {
                toast.success('Registration added');
                setNewName('');
                setNewNumber('');
                setNewStartDate('');
                setNewEndDate('');
                fetchRegistrations();
            } else {
                toast.error('Failed to add registration');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error adding registration');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (regId: string) => {
        if (!confirm('Are you sure you want to delete this registration?')) return;

        try {
            const res = await fetch(`/api/companies/${companyId}/registrations?regId=${regId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Registration deleted');
                setRegistrations(prev => prev.filter(r => r.id !== regId));
            } else {
                toast.error('Failed to delete registration');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error deleting registration');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Registrations</h3>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#495057' }}>Add New Registration</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6c757d' }}>Name</label>
                        <input
                            type="text"
                            placeholder="e.g. GSTIN, PAN, Udyog Aadhar"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6c757d' }}>Number</label>
                        <input
                            type="text"
                            placeholder="Registration Number"
                            value={newNumber}
                            onChange={(e) => setNewNumber(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6c757d' }}>Start Date (Optional)</label>
                        <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#6c757d' }}>End Date (Optional)</label>
                        <input
                            type="date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={isAdding}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            height: '35px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        {isAdding ? 'Adding...' : <><FontAwesomeIcon icon={faPlus} /> Add</>}
                    </button>
                </div>
            </div>

            <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                        <tr>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#495057' }}>Registration Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#495057' }}>Number</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#495057' }}>Start Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#495057' }}>End Date</th>
                            <th style={{ padding: '12px', width: '80px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>Loading registrations...</td>
                            </tr>
                        ) : registrations.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No registrations found.</td>
                            </tr>
                        ) : (
                            registrations.map(reg => (
                                <tr key={reg.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                                    <td style={{ padding: '12px' }}>{reg.registration_name}</td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{reg.registration_number}</td>
                                    <td style={{ padding: '12px' }}>{reg.start_date ? new Date(reg.start_date).toLocaleDateString() : '-'}</td>
                                    <td style={{ padding: '12px' }}>{reg.end_date ? new Date(reg.end_date).toLocaleDateString() : '-'}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDelete(reg.id)}
                                            style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}
                                            title="Delete"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
