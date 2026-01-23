"use client";

import { useState, useEffect } from 'react';
import QuotationModal from './QuotationModal';
import styles from './QuotationList.module.css';
import toast from 'react-hot-toast';

interface Quotation {
    id: string;
    quotation_id: string;
    contact_name: string;
    company_name: string;
    source: string;
    stage: string;
    amount: number;
    created_at: string;
    // ... other fields
}

export default function QuotationList() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/quotations');
            if (!response.ok) throw new Error('Failed to fetch quotations');
            const data = await response.json();
            setQuotations(data);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching quotations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotations();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this quotation?')) {
            try {
                const response = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    fetchQuotations();
                    toast.success('Quotation deleted successfully');
                } else {
                    throw new Error('Failed to delete quotation');
                }
            } catch (err: any) {
                toast.error(err.message);
            }
        }
    };

    const handleEdit = (quotation: Quotation) => {
        setCurrentQuotation(quotation);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setCurrentQuotation(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentQuotation(null);
        fetchQuotations();
    };

    const filteredQuotations = quotations.filter(q =>
        (q.contact_name && q.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.company_name && q.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        q.quotation_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExport = () => {
        const csvContent = [
            ["Quote ID", "Contact", "Company", "Source", "Stage", "Amount", "Created At"],
            ...filteredQuotations.map(q => [
                q.quotation_id,
                q.contact_name,
                q.company_name,
                q.source,
                q.stage,
                q.amount,
                new Date(q.created_at).toLocaleDateString()
            ].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `quotations_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) return <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Loading Quotations...</p></div>;
    if (error) return <div className={styles.error}>Error: {error}</div>;

    return (
        <div className={styles.container}>
            <div className={styles.topNav}>
                <div className={styles.searchWrapper}>
                    <i className={`fa-sharp fa-thin fa-search ${styles.searchIcon}`}></i>
                    <input
                        type="text"
                        placeholder="Search quotations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <button
                    onClick={handleExport}
                    className={styles.tagsButton}
                    title="Export Quotations"
                    style={{ marginLeft: 'auto' }}
                >
                    <i className="fa-sharp fa-thin fa-file-export"></i>
                    <span>Export</span>
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Quote ID</th>
                            <th>Contact</th>
                            <th>Company</th>
                            <th>Source</th>
                            <th>Stage</th>
                            <th>Products</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredQuotations.length > 0 ? (
                            filteredQuotations.map((quotation) => (
                                <tr key={quotation.id}>
                                    <td>{quotation.quotation_id}</td>
                                    <td>{quotation.contact_name}</td>
                                    <td>{quotation.company_name}</td>
                                    <td>{quotation.source}</td>
                                    <td>{quotation.stage}</td>
                                    <td>
                                        {(quotation as any).products && (quotation as any).products.length > 0
                                            ? (
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {(quotation as any).products.length} Items
                                                </div>
                                            )
                                            : '-'
                                        }
                                    </td>
                                    <td>₹{quotation.amount}</td>
                                    <td className={styles.actions}>
                                        <button onClick={() => handleEdit(quotation)} className={styles.editButton}>Edit</button>
                                        <button onClick={() => handleDelete(quotation.id)} className={styles.deleteButton}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} className={styles.noResults}>No quotations found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <button onClick={handleAddNew} className={styles.floatingButton} title="Add New Quotation">
                <i className="fa-light fa-plus"></i>
            </button>

            <QuotationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialData={currentQuotation}
                onSuccess={handleCloseModal}
            />
        </div>
    );
}
