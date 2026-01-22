'use client';

import { useState, useEffect } from 'react';

type CompanyOption = {
    id: string;
    name: string;
};


type CompanySelectorProps = {
    selectedCompanyId: string | null;
    selectedCompanyName?: string | null;
    onCompanyChange: (companyId: string | null, companyName?: string | null) => void;
    disabled?: boolean;
    className?: string; // CSS class for inputs
    hideModeSelector?: boolean; // Option to hide built-in radio buttons
};

export default function CompanySelector({
    selectedCompanyId,
    selectedCompanyName,
    onCompanyChange,
    disabled = false,
    className,
    hideModeSelector = false
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
            setMode('new');
            setNewCompanyName(selectedCompanyName);
        } else {
            // If strictly controlled by external props (like ContactDetail), 
            // empty ID might mean 'none' or just 'not selected yet'.
            // If hideModeSelector is on, we might default to existing or rely on parent.
            setMode(selectedCompanyId === '' ? 'none' : 'existing');
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

        fetchCompanies();
    }, []);

    const handleModeChange = (newMode: 'existing' | 'new' | 'none') => {
        setMode(newMode);
        if (newMode === 'none') {
            onCompanyChange(null, null);
        } else if (newMode === 'existing') {
            onCompanyChange('', null);
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

    // If hiding mode selector, we assume parent handles logic or we default to 'existing' dropdown behavior
    // but we need to ensure we show the dropdown if mode is existing/none
    const showDropdown = mode === 'existing' || (hideModeSelector && mode !== 'new');

    return (
        <div style={hideModeSelector ? {} : { border: '1px solid #eee', padding: '10px', borderRadius: '4px' }}>
            {!hideModeSelector && (
                <>
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
                        {/* ... other radios ... */}
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
                </>
            )}

            {showDropdown && (
                <select
                    value={selectedCompanyId || ''}
                    onChange={handleExistingChange}
                    disabled={disabled || loading}
                    className={className}
                    style={className ? {} : { width: '100%', padding: '8px', borderRadius: '4px' }}
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
                    className={className}
                    style={className ? {} : { width: '100%', padding: '8px' }}
                />
            )}

            {!hideModeSelector && mode === 'none' && (
                <div style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic' }}>
                    This contact will not be linked to any company.
                </div>
            )}
        </div>
    );
}
