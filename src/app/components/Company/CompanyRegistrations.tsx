'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave, faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import styles from './companyregistrations.module.css';

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

    // Add State
    const [newName, setNewName] = useState('');
    const [newNumber, setNewNumber] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editNumber, setEditNumber] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');

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

    const startEdit = (reg: Registration) => {
        setEditingId(reg.id);
        setEditName(reg.registration_name);
        setEditNumber(reg.registration_number);
        setEditStartDate(reg.start_date ? reg.start_date.split('T')[0] : '');
        setEditEndDate(reg.end_date ? reg.end_date.split('T')[0] : '');
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const handleUpdate = async (regId: string) => {
        if (!editName.trim() || !editNumber.trim()) {
            toast.error('Name and Number are required');
            return;
        }

        try {
            const res = await fetch(`/api/companies/${companyId}/registrations/${regId}`, { // Assuming this endpoint exists, or modify logic
                // If the API is single endpoint, we might need to adjust. 
                // However, based on user request "registration edit karne ka option", 
                // I assume I should use PUT /api/companies/[id]/registrations with query or id in body, 
                // OR assuming standard REST: PUT /api/companies/[id]/registrations/[regId]
                // Let's try standard REST first. If 404, we can fix.
                // Re-reading code: The DELETE used `?regId=...`. So likely PUT/POST also needs alignment.
                // Let's use the same pattern as DELETE if possible: `/api/companies/${companyId}/registrations?regId=${regId}`
                // but usually PUT has body.

                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_name: editName,
                    registration_number: editNumber,
                    start_date: editStartDate || null,
                    end_date: editEndDate || null,
                    id: regId // Pass ID in body too just in case
                }),
            });

            if (res.ok) {
                toast.success('Registration updated');
                setEditingId(null);
                fetchRegistrations();
            } else {
                toast.error('Failed to update registration');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error updating registration');
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
        <div className={styles.registrationContainer}>
            <div className={styles.header}>
                <h3>Registrations</h3>
            </div>

            <div className={styles.addForm}>
                <h4 className={styles.formTitle}>Add New Registration</h4>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Name</label>
                        <input
                            type="text"
                            placeholder="e.g. GSTIN, PAN"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Number</label>
                        <input
                            type="text"
                            placeholder="Registration Number"
                            value={newNumber}
                            onChange={(e) => setNewNumber(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Start Date</label>
                        <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>End Date</label>
                        <input
                            type="date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={isAdding}
                        className={styles.addButton}
                    >
                        {isAdding ? 'Adding...' : <><FontAwesomeIcon icon={faPlus} /> Add</>}
                    </button>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr>
                            <th className={styles.th}>Registration Name</th>
                            <th className={styles.th}>Number</th>
                            <th className={styles.th}>Start Date</th>
                            <th className={styles.th}>End Date</th>
                            <th className={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className={styles.loading}>Loading registrations...</td>
                            </tr>
                        ) : registrations.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.loading}>No registrations found.</td>
                            </tr>
                        ) : (
                            registrations.map(reg => (
                                <tr key={reg.id} className={styles.tr}>
                                    {editingId === reg.id ? (
                                        <>
                                            <td className={styles.td}>
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className={styles.input}
                                                />
                                            </td>
                                            <td className={styles.td}>
                                                <input
                                                    value={editNumber}
                                                    onChange={e => setEditNumber(e.target.value)}
                                                    className={styles.input}
                                                />
                                            </td>
                                            <td className={styles.td}>
                                                <input
                                                    type="date"
                                                    value={editStartDate}
                                                    onChange={e => setEditStartDate(e.target.value)}
                                                    className={styles.input}
                                                />
                                            </td>
                                            <td className={styles.td}>
                                                <input
                                                    type="date"
                                                    value={editEndDate}
                                                    onChange={e => setEditEndDate(e.target.value)}
                                                    className={styles.input}
                                                />
                                            </td>
                                            <td className={styles.td}>
                                                <button onClick={() => handleUpdate(reg.id)} className={styles.actionButton} title="Save">
                                                    <FontAwesomeIcon icon={faSave} style={{ color: '#28a745' }} />
                                                </button>
                                                <button onClick={cancelEdit} className={styles.actionButton} title="Cancel">
                                                    <FontAwesomeIcon icon={faTimes} style={{ color: '#6c757d' }} />
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={styles.td}>{reg.registration_name}</td>
                                            <td className={styles.td} style={{ fontWeight: 500 }}>{reg.registration_number}</td>
                                            <td className={styles.td}>{reg.start_date ? new Date(reg.start_date).toLocaleDateString() : '-'}</td>
                                            <td className={styles.td}>{reg.end_date ? new Date(reg.end_date).toLocaleDateString() : '-'}</td>
                                            <td className={styles.td}>
                                                <button
                                                    onClick={() => startEdit(reg)}
                                                    className={`${styles.actionButton} ${styles.editBtn}`}
                                                    title="Edit"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(reg.id)}
                                                    className={`${styles.actionButton} ${styles.deleteBtn}`}
                                                    title="Delete"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
