'use client';

import { useState, useEffect } from 'react';

type ContactOption = {
    id: string;
    first_name: string;
    last_name: string;
    company_id?: string | null;
    company_name?: string | null;
};

type ContactSelectorProps = {
    onContactSelect: (contactId: string) => void;
    disabled?: boolean;
    excludeCompanyId?: string; // To visually indicate availability or filter
};

export default function ContactSelector({
    onContactSelect,
    disabled = false,
    excludeCompanyId
}: ContactSelectorProps) {
    const [contacts, setContacts] = useState<ContactOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedContactId, setSelectedContactId] = useState('');

    // Fetch contacts
    useEffect(() => {
        const fetchContacts = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/contacts');
                if (res.ok) {
                    const data = await res.json();
                    // Ideally filter out contacts that are already associated with THIS company?
                    // Or show all but indicate status?
                    // For now, fetch all.
                    setContacts(data);
                }
            } catch (e) {
                console.error("Failed to fetch contacts", e);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedContactId(val);
        if (val) {
            onContactSelect(val);
        }
    };

    return (
        <div style={{ marginBottom: '10px' }}>
            <label style={{ marginBottom: '4px', display: 'block', fontSize: '0.9em', color: '#666' }}>
                Associate Existing Contact
            </label>
            <select
                value={selectedContactId}
                onChange={handleChange}
                disabled={disabled || loading}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
                <option value="">-- Select Contact to Associate --</option>
                {contacts.map(contact => {
                    const isAssigned = !!contact.company_name; // Rough check
                    return (
                        <option key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name} {isAssigned ? `(${contact.company_name})` : ''}
                        </option>
                    );
                })}
            </select>
            <p style={{ fontSize: '0.8em', color: '#888', marginTop: '4px' }}>
                Selecting a contact will link them to this company.
            </p>
        </div>
    );
}
