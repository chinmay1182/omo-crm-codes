import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from './PaymentHistoryModal.module.css';

interface PaymentHistoryModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    userId: string;
}

interface Payment {
    id: string;
    razorpay_payment_id?: string;
    amount: number;
    status: string;
    created_at: string;
    payment_date?: string;
    currency?: string;
    subscriptions?: {
        plan_name: string;
    };
}

interface Refund {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    refund_date?: string;
    reason?: string;
}

export default function PaymentHistoryModal({ isOpen, onRequestClose, userId }: PaymentHistoryModalProps) {
    const [activeTab, setActiveTab] = useState<'all' | 'receipts' | 'refunds'>('all');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewReceipt, setPreviewReceipt] = useState<Payment | null>(null);

    const fetchData = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            // Add timestamp to prevent caching
            const response = await fetch(`/api/payments/history?userId=${userId}&t=${Date.now()}`);
            const data = await response.json();

            if (data.payments) setPayments(data.payments);
            if (data.refunds) setRefunds(data.refunds);
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setActiveTab('all');
            setPreviewReceipt(null);
            fetchData();
        }
    }, [isOpen, userId]);

    const getFilteredPayments = () => {
        switch (activeTab) {
            case 'receipts':
                return payments.filter(p => p.status === 'success');
            case 'all':
            default:
                return payments;
        }
    };

    const renderStatusPill = (status: string) => {
        let className = styles.statusPending;
        if (status === 'success' || status === 'processed') className = styles.statusSuccess;
        if (status === 'failed') className = styles.statusFailed;

        return (
            <div className={`${styles.statusPill} ${className}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
        );
    };

    const renderReceiptPreview = () => {
        if (!previewReceipt) return null;

        const date = new Date(previewReceipt.payment_date || previewReceipt.created_at).toLocaleDateString();

        return (
            <div className={styles.modalBody}>
                <button className={styles.backButton} onClick={() => setPreviewReceipt(null)}>
                    <i className="fa-thin fa-arrow-left"></i> Back to list
                </button>

                <div className={styles.receiptPreviewContainer}>
                    <div className={styles.receiptHeader}>
                        <h2 className={styles.receiptTitle}>Payment Receipt</h2>
                        <div className={styles.receiptLogo}>
                            <i className="fa-solid fa-check-circle"></i>
                        </div>
                    </div>

                    <div className={styles.receiptRow}>
                        <span className={styles.receiptLabel}>Transaction ID</span>
                        <span className={styles.receiptValue}>{previewReceipt.razorpay_payment_id || previewReceipt.id}</span>
                    </div>
                    <div className={styles.receiptRow}>
                        <span className={styles.receiptLabel}>Date</span>
                        <span className={styles.receiptValue}>{date}</span>
                    </div>
                    <div className={styles.receiptRow}>
                        <span className={styles.receiptLabel}>Status</span>
                        <span className={styles.receiptValue}>{previewReceipt.status.toUpperCase()}</span>
                    </div>
                    <div className={styles.receiptRow}>
                        <span className={styles.receiptLabel}>Plan</span>
                        <span className={styles.receiptValue}>{previewReceipt.subscriptions?.plan_name || 'Subscription'}</span>
                    </div>

                    <div className={styles.receiptTotal}>
                        <span>Total Paid</span>
                        <span>₹{previewReceipt.amount}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className={styles.modal}
            overlayClassName={styles.modalOverlay}
            contentLabel="Payment History"
        >
            <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Payment History</h2>
                <button onClick={onRequestClose} className={styles.closeButton}>
                    <i className="fa-sharp fa-thin fa-times"></i>
                </button>
            </div>

            {!previewReceipt && (
                <div className={styles.tabsContainer}>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Payments
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'receipts' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('receipts')}
                    >
                        Payment Receipts
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'refunds' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('refunds')}
                    >
                        Payment Refunds
                    </button>
                </div>
            )}

            {loading ? (
                <div className={styles.modalBody} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <p>Loading...</p>
                </div>
            ) : previewReceipt ? (
                renderReceiptPreview()
            ) : (
                <div className={styles.modalBody}>
                    {activeTab === 'refunds' ? (
                        <div className={styles.listContainer}>
                            {refunds.length > 0 ? (
                                refunds.map((refund) => (
                                    <div key={refund.id} className={styles.paymentItem}>
                                        <div className={styles.itemLeft}>
                                            <div className={styles.itemTitle}>Refund</div>
                                            <div className={styles.itemDate}>
                                                {new Date(refund.refund_date || refund.created_at).toLocaleDateString('en-IN', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                            {refund.reason && <div className={styles.itemId}>{refund.reason}</div>}
                                        </div>
                                        <div className={styles.itemRight}>
                                            <div className={`${styles.amount} ${styles.amountRefund}`}>-₹{refund.amount}</div>
                                            {renderStatusPill(refund.status)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>No refunds found</div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.listContainer}>
                            {getFilteredPayments().length > 0 ? (
                                getFilteredPayments().map((payment) => (
                                    <div key={payment.id} className={styles.paymentItem}>
                                        <div className={styles.itemLeft}>
                                            <div className={styles.itemTitle}>
                                                {payment.subscriptions?.plan_name || 'Subscription'}
                                            </div>
                                            <div className={styles.itemDate}>
                                                {new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                            <div className={styles.itemId}>ID: {payment.razorpay_payment_id || payment.id}</div>
                                            {payment.status === 'success' && (
                                                <button
                                                    className={styles.viewReceiptBtn}
                                                    onClick={() => setPreviewReceipt(payment)}
                                                >
                                                    <i className="fa-thin fa-eye" style={{ marginRight: '4px' }}></i>
                                                    View Receipt
                                                </button>
                                            )}
                                        </div>
                                        <div className={styles.itemRight}>
                                            <div className={styles.amount}>₹{payment.amount}</div>
                                            {renderStatusPill(payment.status)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>No payments found</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
