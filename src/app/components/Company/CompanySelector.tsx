'use client';

import { useState, useEffect } from 'react';

type CompanyOption = {
    id: string;
    name: string;
};

type CompanySelectorProps = {
    selectedCompanyId: string | null;
    selectedCompanyName?: string | null; // For new company matching
    onCompanyChange: (companyId: string | null, companyName?: string | null) => void;
    disabled?: boolean;
};

export default function CompanySelector({
    selectedCompanyId,
    selectedCompanyName,
    onCompanyChange,
    disabled = false
}: CompanySelectorProps) {
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'existing' | 'new' | 'none'>('none');
    const [newCompanyName, setNewCompanyName] = useState('');

    // Initial setup
    useEffect(() => {
        if (selectedCompanyId) {
            setMode('existing');
        } else if (selectedCompanyName && !selectedCompanyId) {
            // If we have a name but no ID, it might be a "new" company or just unlinked text (if logic supported it)
            // Assume 'new' for now if name is provided but no ID
            setMode('new');
            setNewCompanyName(selectedCompanyName);
        } else {
            setMode('none');
        }
    }, [selectedCompanyId, selectedCompanyName]);

    // Fetch companies
    useEffect(() => {
        const fetchCompanies = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/companies');
                if (res.ok) {
                    const data = await res.json();
                    setCompanies(data);
                }
            } catch (e) {
                console.error("Failed to fetch companies", e);
            } finally {
                setLoading(false);
            }
        };

        // Fetch only if needed or generally available
        fetchCompanies();
    }, []);

    const handleModeChange = (newMode: 'existing' | 'new' | 'none') => {
        setMode(newMode);
        if (newMode === 'none') {
            onCompanyChange(null, null);
        } else if (newMode === 'existing') {
            // Keep existing ID if present
            if (selectedCompanyId) {
                onCompanyChange(selectedCompanyId, null);
            } else {
                onCompanyChange('', null);
            }
        } else if (newMode === 'new') {
            onCompanyChange(null, newCompanyName);
        }
    };

    const handleExistingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        onCompanyChange(val || null, null);
    };

    const handleNewNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewCompanyName(val);
        onCompanyChange(null, val);
    };

    return (
        <div style={{ border: '1px solid #eee', padding: '10px', borderRadius: '4px' }}>
            <label style={{ marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>Company Association</label>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="companyModeSelector"
                        value="existing"
                        checked={mode === 'existing'}
                        onChange={() => handleModeChange('existing')}
                        disabled={disabled}
                        style={{ marginRight: '5px' }}
                    />
                    Select Existing
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="companyModeSelector"
                        value="new"
                        checked={mode === 'new'}
                        onChange={() => handleModeChange('new')}
                        disabled={disabled}
                        style={{ marginRight: '5px' }}
                    />
                    Create New
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="companyModeSelector"
                        value="none"
                        checked={mode === 'none'}
                        onChange={() => handleModeChange('none')}
                        disabled={disabled}
                        style={{ marginRight: '5px' }}
                    />
                    Not Applicable
                </label>
            </div>

            {mode === 'existing' && (
                <select
                    value={selectedCompanyId || ''}
                    onChange={handleExistingChange}
                    disabled={disabled || loading}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                    <option value="">-- Select Company --</option>
                    {companies.map(comp => (
                        <option key={comp.id} value={comp.id}>
                            {comp.name}
                        </option>
                    ))}
                </select>
            )}

            {mode === 'new' && (
                <input
                    type="text"
                    value={newCompanyName}
                    onChange={handleNewNameChange}
                    disabled={disabled}
                    placeholder="Enter new company name"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
            )}

            {mode === 'none' && (
                <div style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic' }}>
                    This contact will not be linked to any company.
                </div>
            )}
        </div>
    );
}
