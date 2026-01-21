
'use client';

import React, { useEffect, useState } from 'react';
import styles from './builder.module.css';
import { ElementsType, FormElements } from './FormElements';
import toast from 'react-hot-toast';

export default function FormResponses({ formId, formContent }: { formId: string, formContent: string }) {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Parse form content to get labels for columns
    const formElements = JSON.parse(formContent || '[]');
    const columns: { id: string; label: string; type: ElementsType }[] = [];

    formElements.forEach((element: any) => {
        // Exclude layout elements from columns
        if (element.type !== 'Title' && element.type !== 'SubTitle' && element.type !== 'Paragraph' && element.type !== 'Separator' && element.type !== 'Spacer') {
            columns.push({
                id: element.id,
                label: element.extraAttributes?.label || element.type,
                type: element.type
            });
        }
    });

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const res = await fetch(`/api/forms/${formId}/submissions`);
                const data = await res.json();
                if (res.ok) {
                    setSubmissions(data);
                } else {
                    toast.error('Failed to fetch submissions');
                }
            } catch (e) {
                toast.error('Error loading submissions');
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, [formId]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading submissions...</p>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className={styles.responsesContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', background: '#fff', borderRadius: '20px' }}>
                <i className="fa-light fa-inbox" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}></i>
                <h3 style={{ color: '#64748b', fontWeight: 300, fontSize: '24px' }}>No submissions yet</h3>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 300 }}>Share your form link to collect responses.</p>
            </div>
        );
    }

    const handleExport = () => {
        // Headers
        const headers = ['Submitted At', ...columns.map(col => col.label)];

        // Rows
        const rows = submissions.map(submission => {
            const content = JSON.parse(submission.content);
            const rowData = [
                new Date(submission.created_at).toLocaleString(),
                ...columns.map(col => {
                    const val = content[col.id];
                    // Clean value for CSV (remove quotes, handle commas)
                    let formattedVal = formatValue(val, col.type);
                    if (React.isValidElement(formattedVal)) {
                        // Extract text from React element (like StarRating) or just use raw value
                        if (col.type === 'StarRating') formattedVal = val || '0';
                        else formattedVal = val;
                    }
                    if (typeof formattedVal === 'string') {
                        return `"${formattedVal.replace(/"/g, '""')}"`;
                    }
                    return `"${formattedVal}"`;
                })
            ];
            return rowData.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'form_responses.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles.responsesContainer} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 300, margin: 0, color: '#1e293b' }}>
                    Submissions ({submissions.length})
                </h3>
                <button
                    onClick={handleExport}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#11a454',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 300,
                        fontFamily: 'Open Sauce One, sans-serif',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#10964d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#11a454'}
                >
                    <i className="fa-sharp fa-thin fa-file-excel"></i> Export to Excel
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Submitted At</th>
                            {columns.map(col => (
                                <th key={col.id}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map((submission) => {
                            const content = JSON.parse(submission.content);
                            return (
                                <tr key={submission.id}>
                                    <td>
                                        <div style={{ fontWeight: 300, color: '#1e293b' }}>
                                            {new Date(submission.created_at).toLocaleDateString()}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 300 }}>
                                            {new Date(submission.created_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    {columns.map(col => (
                                        <td key={col.id}>
                                            {formatValue(content[col.id], col.type)}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function formatValue(value: string | undefined, type: ElementsType) {
    if (!value) return '-';

    // CheckboxGroupField stores JSON array string
    if (type === 'CheckboxGroupField') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.join(', ');
            return value;
        } catch {
            return value;
        }
    }

    // CheckboxField stores 'true'/'false'
    if (type === 'CheckboxField') {
        return value === 'true' ? 'Yes' : 'No';
    }

    if (type === 'StarRating') {
        const rating = parseInt(value || '0');
        return (
            <div style={{ display: 'flex', gap: '2px' }}>
                {[...Array(5)].map((_, i) => (
                    <i
                        key={i}
                        className={`fa-star ${i < rating ? 'fa-solid' : 'fa-regular'}`}
                        style={{ color: i < rating ? '#FFD700' : '#ddd', fontSize: '12px' }}
                    ></i>
                ))}
            </div>
        );
    }

    return value;
}
