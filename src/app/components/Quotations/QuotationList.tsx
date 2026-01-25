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
    notes?: string;
    // ... other fields
}

export default function QuotationList() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusData, setStatusData] = useState<{
        id: string;
        stage: string;
        amount?: number;
    } | null>(null);
    const [paymentType, setPaymentType] = useState<'Full' | 'Partial'>('Full');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');

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

    const handleStatusChange = (quotation: Quotation, newStage: string) => {
        if (newStage === 'Payment Receipt') {
            setStatusData({ id: quotation.id, stage: newStage, amount: quotation.amount });
            setPaymentType('Full');
            setPaymentAmount(quotation.amount ? quotation.amount.toString() : '');
            setTransactionId('');
            setStatusModalOpen(true);
        } else {
            updateQuotationStatus(quotation.id, newStage);
        }
    };

    const updateQuotationStatus = async (quotationId: string, stage: string, extraData: any = {}) => {
        try {
            const response = await fetch(`/api/quotations/${quotationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage, ...extraData })
            });

            if (response.ok) {
                toast.success('Status updated');
                fetchQuotations();
                setStatusModalOpen(false);
                setStatusData(null);
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleStatusConfirm = () => {
        if (!transactionId.trim()) {
            toast.error("Transaction ID is required");
            return;
        }

        if (statusData) {
            const finalAmount = parseFloat(paymentAmount);

            if (paymentType === 'Partial' && statusData.amount && finalAmount >= statusData.amount) {
                toast.error(`Partial amount must be less than total amount (₹${statusData.amount})`);
                return;
            }

            // Prepare payload matching QuotationModal logic
            const payload = {
                payment_status: paymentType,
                transaction_id: transactionId,
                received_amount: paymentType === 'Full' ? statusData.amount : finalAmount
            };

            updateQuotationStatus(statusData.id, 'Payment Receipt', payload);
        }
    };

    const handleView = (quotation: Quotation) => {
        window.open(`/api/quotations/${quotation.id}/view`, "_blank");
    };

    const handleDownload = (quotation: Quotation) => {
        window.open(`/api/quotations/${quotation.id}/download`, "_blank");
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
                            <th>Notes</th>
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
                                    <td>
                                        {quotation.stage === 'Drop' || quotation.stage === 'Payment Receipt' || quotation.stage === 'Converted' ? ( // Assuming these are terminal states where 'Payment Receipt' is final for this flow? User said "expired or dropped". Let's check user request: "expired ya dropped ho toh option na aaye".
                                            // The user request says "expired ya sropped".
                                            // Quotation doesn't have "Expired" in options, but has "Drop". (Step 96: Created, Confirm, Dispatch, Billed, Payment Receipt, Drop, Hold)
                                            // If "Drop" is selected, dropdown should be disabled or replaced by text.
                                            // Also "Payment Receipt" is effectively "Closed/Paid", maybe that too?
                                            // User specifically said "expired ya sropped". Quotations usually don't have "Expired" status in the dropdown list I saw (it was calculated in Proposals).
                                            // Wait, Quotation interface has `stage` (string).
                                            // If stage is 'Drop', render text instead of select.
                                            <span style={{ fontSize: '14px', color: quotation.stage === 'Drop' ? '#dc2626' : '#15803d', paddingLeft: '0' }}>
                                                {quotation.stage}
                                            </span>
                                        ) : (
                                            <select
                                                value={quotation.stage}
                                                onChange={(e) => handleStatusChange(quotation, e.target.value)}
                                                className={styles.dropdown}
                                            >
                                                <option value="Created">Created</option>
                                                <option value="Confirm">Confirm</option>
                                                <option value="Dispatch">Dispatch</option>
                                                <option value="Billed">Billed</option>
                                                <option value="Payment Receipt">Payment Receipt</option>
                                                <option value="Drop">Drop</option>
                                                <option value="Hold">Hold</option>
                                            </select>
                                        )}
                                    </td>
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
                                    <td>
                                        <div title={quotation.notes} style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {quotation.notes || '-'}
                                        </div>
                                    </td>
                                    <td className={styles.actions}>
                                        <button onClick={() => handleView(quotation)} className={styles.viewButton} title="View PDF">
                                            <i className="fa-light fa-eye"></i>
                                        </button>
                                        <button onClick={() => handleDownload(quotation)} className={styles.downloadButton} title="Download PDF">
                                            <i className="fa-light fa-download"></i>
                                        </button>
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

            {/* Payment Status Modal */}
            {statusModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Payment Details</h3>
                            <button onClick={() => setStatusModalOpen(false)} className={styles.closeButton}>
                                <i className="fa-light fa-xmark"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
                                        <input
                                            type="radio"
                                            name="paymentType"
                                            value="Full"
                                            checked={paymentType === 'Full'}
                                            onChange={() => {
                                                setPaymentType('Full');
                                                setPaymentAmount(statusData?.amount?.toString() || '');
                                            }}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: '300' }}>Full Payment</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0 }}>
                                        <input
                                            type="radio"
                                            name="paymentType"
                                            value="Partial"
                                            checked={paymentType === 'Partial'}
                                            onChange={() => setPaymentType('Partial')}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: '300' }}>Partial Payment</span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Received Amount</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    disabled={paymentType === 'Full'}
                                    className={styles.input}
                                    style={paymentType === 'Full' ? { background: '#f8fafc', color: '#94a3b8' } : {}}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Transaction ID <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    placeholder="Enter Transaction/Reference ID"
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    onClick={() => setStatusModalOpen(false)}
                                    className={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStatusConfirm}
                                    className={styles.submitButton}
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
