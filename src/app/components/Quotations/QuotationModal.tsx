"use client";

import React, { useState, useEffect } from 'react';
import styles from './QuotationModal.module.css';
import toast from 'react-hot-toast';

interface QuotationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: any;
    onSuccess: () => void;
}

const QuotationModal: React.FC<QuotationModalProps> = ({ isOpen, onClose, initialData, onSuccess }) => {
    const [formData, setFormData] = useState({
        contact_name: '',
        company_name: '',
        source: 'Website',
        stage: 'Created',
        amount: '',
        notes: '',
        products: [],
        payment_status: 'Full',
        received_amount: '',
        transaction_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch('/api/products');
                if (response.ok) {
                    const data = await response.json();
                    setAvailableProducts(data);
                }
            } catch (error) {
                console.error("Failed to fetch products", error);
            }
        };

        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                payment_status: initialData.payment_status || 'Full',
                received_amount: initialData.received_amount || '',
                transaction_id: initialData.transaction_id || ''
            });
            if (initialData.products) {
                // Check if it's already an array; if it's JSON string in some setups, parse it.
                // Assuming Supabase returns JSONB as object/array automatically.
                setSelectedProducts(Array.isArray(initialData.products) ? initialData.products : []);
            }
        } else {
            setFormData({
                contact_name: '',
                company_name: '',
                source: 'Website',
                stage: 'Created',
                amount: '',
                notes: '',
                products: [],
                payment_status: 'Full',
                received_amount: '',
                transaction_id: ''
            });
            setSelectedProducts([]);
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value;
        if (!productId) return;

        const product = availableProducts.find(p => p.id.toString() === productId.toString());
        if (product) {
            // Avoid duplicates if needed, or allow them with qty adjustment.
            // For simplicity, unique products in list for now, or allow duplicates.
            // User restriction: "select multiple". Tags usually imply unique set, but let's allow adding same product again?
            // Usually quotation has unique line items.
            // If duplicate, maybe increase quantity? 
            // Let's prevent strict duplicate ID in array for UI simplicity first. 
            if (!selectedProducts.find(p => p.id === product.id)) {
                setSelectedProducts([...selectedProducts, { ...product, qty: 1 }]);
            } else {
                toast('Product already added');
            }
        }
    };

    const removeProduct = (productId: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const url = initialData ? `/api/quotations/${initialData.id}` : '/api/quotations';
            const method = initialData ? 'PUT' : 'POST';

            let finalReceivedAmount = formData.received_amount;
            if (formData.stage === 'Payment Receipt' && formData.payment_status === 'Full') {
                finalReceivedAmount = formData.amount;
            }

            const payload = {
                ...formData,
                amount: formData.amount ? Number(formData.amount) : 0,
                received_amount: finalReceivedAmount ? Number(finalReceivedAmount) : null,
                products: selectedProducts
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save quotation');

            toast.success(initialData ? 'Quotation updated' : 'Quotation created');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{initialData ? 'Edit Quotation' : 'Add New Quotation'}</h2>
                    <button onClick={onClose} className={styles.closeButton}><i className="fa-light fa-xmark"></i></button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Contact Name</label>
                            <input name="contact_name" value={formData.contact_name} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Company Name</label>
                            <input name="company_name" value={formData.company_name} onChange={handleChange} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Source</label>
                            <input name="source" value={formData.source} onChange={handleChange} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Stage</label>
                            <select name="stage" value={formData.stage} onChange={handleChange}>
                                <option value="Created">Created</option>
                                <option value="Confirm">Confirm</option>
                                <option value="Dispatch">Dispatch</option>
                                <option value="Billed">Billed</option>
                                <option value="Payment Receipt">Payment Receipt</option>
                                <option value="Drop">Drop</option>
                                <option value="Hold">Hold</option>
                            </select>
                        </div>

                        {formData.stage === 'Payment Receipt' && (
                            <div className={styles.formGroupFull} style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', marginTop: '10px' }}>
                                <label style={{ marginBottom: '10px', fontWeight: '500', color: '#15426d' }}>Payment Details</label>

                                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="payment_status"
                                            value="Full"
                                            checked={formData.payment_status === 'Full'}
                                            onChange={handleChange}
                                            style={{ width: 'auto', margin: 0 }}
                                        />
                                        Full Payment
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="payment_status"
                                            value="Partial"
                                            checked={formData.payment_status === 'Partial'}
                                            onChange={handleChange}
                                            style={{ width: 'auto', margin: 0 }}
                                        />
                                        Partial Payment
                                    </label>
                                </div>

                                <div className={styles.formGrid} style={{ gap: '1rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>Amount Received</label>
                                        <input
                                            type="number"
                                            name="received_amount"
                                            value={formData.payment_status === 'Full' ? formData.amount : formData.received_amount}
                                            onChange={handleChange}
                                            disabled={formData.payment_status === 'Full'}
                                            style={formData.payment_status === 'Full' ? { backgroundColor: '#e9ecef' } : {}}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Transaction ID *</label>
                                        <input
                                            name="transaction_id"
                                            value={formData.transaction_id}
                                            onChange={handleChange}
                                            placeholder="Enter Transaction/Order ID"
                                            required={formData.stage === 'Payment Receipt'}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroupFull}>
                            <label>Add Products</label>
                            <select
                                onChange={handleProductSelect}
                                className={styles.select}
                                value=""
                                style={{
                                    width: '100%',
                                    padding: '6px 0',
                                    border: 'none',
                                    borderBottom: '1px solid #e0e0e0',
                                    borderRadius: '0',
                                    fontFamily: 'Open Sauce One, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: '300',
                                    color: '#444',
                                    background: 'transparent'
                                }}
                            >
                                <option value="">Select a product...</option>
                                {availableProducts.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.product_name} ({product.product_code}) - ₹{product.sale_price}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedProducts.length > 0 && (
                            <div className={styles.formGroupFull}>
                                <div className={styles.tagContainer}>
                                    {selectedProducts.map(p => (
                                        <div key={p.id} className={styles.tagButton} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '6px' }}>
                                            <span>{p.product_name}</span>
                                            <span style={{ fontSize: '11px', color: '#666' }}>₹{p.sale_price}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeProduct(p.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                                            >
                                                <i className="fa-regular fa-times"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label>Amount</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleChange} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} />
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button>
                        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuotationModal;
