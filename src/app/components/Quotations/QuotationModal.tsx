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
        transaction_id: '',
        discount_type: 'All',
        discount_value: 0,
        gst_rate: 18
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

    const [availableContacts, setAvailableContacts] = useState<any[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
    const [showContactSuggestions, setShowContactSuggestions] = useState(false);

    const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
    const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, contactsRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/contacts')
                ]);

                if (productsRes.ok) {
                    const data = await productsRes.json();
                    setAvailableProducts(data);
                }

                if (contactsRes.ok) {
                    const data = await contactsRes.json();
                    const formattedContacts = data.map((c: any) => ({
                        ...c,
                        name: `${c.first_name || ''} ${c.last_name || ''}`.trim()
                    }));
                    setAvailableContacts(formattedContacts);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                payment_status: initialData.payment_status || 'Full',
                received_amount: initialData.received_amount || '',
                transaction_id: initialData.transaction_id || '',
                discount_type: initialData.discount_type || 'All',
                discount_value: initialData.discount_value || 0
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
                transaction_id: '',
                discount_type: 'All',
                discount_value: 0,
                gst_rate: 18
            });
            setSelectedProducts([]);
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'contact_name') {
            const searchTerm = value.toLowerCase();
            const filtered = availableContacts.filter(c =>
                (c.name || '').toLowerCase().includes(searchTerm) ||
                (c.company_name || '').toLowerCase().includes(searchTerm)
            );
            setFilteredContacts(filtered.slice(0, 5));
            setShowContactSuggestions(true);
        }

        if (name === 'company_name') {
            const searchTerm = value.toLowerCase();
            const uniqueCompanies = Array.from(new Set(availableContacts.map(c => c.company_name).filter(Boolean)));
            const filtered = uniqueCompanies.filter(c => c.toLowerCase().includes(searchTerm));
            setFilteredCompanies(filtered.slice(0, 5));
            setShowCompanySuggestions(true);
        }
    };

    const handleSelectContact = (contact: any) => {
        setFormData(prev => ({
            ...prev,
            contact_name: contact.name || '',
            company_name: contact.company_name || ''
        }));
        setShowContactSuggestions(false);
    };

    const handleSelectCompany = (company: string) => {
        setFormData(prev => ({
            ...prev,
            company_name: company
        }));
        setShowCompanySuggestions(false);
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

    const handleProductChange = (productId: string, field: string, value: string) => {
        setSelectedProducts(prev => prev.map(p => {
            if (p.id === productId) {
                // If it's discount_type, value is string. If it's numeric field, convert.
                const val = (field === 'qty' || field === 'discount') ? Number(value) : value;
                return { ...p, [field]: val };
            }
            return p;
        }));
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
                discount_value: formData.discount_value ? Number(formData.discount_value) : 0,
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

    // Auto-calculate amount
    // Auto-calculate amount
    useEffect(() => {
        if (selectedProducts.length > 0) {
            const subtotal = selectedProducts.reduce((sum, p) => {
                const price = Number(p.sale_price || 0);
                const qty = Number(p.qty || 1);
                const discount = Number(p.discount || 0);
                const itemTotal = (price * qty) * (1 - discount / 100);
                return sum + itemTotal;
            }, 0);

            let final = subtotal;

            if (formData.gst_rate) {
                final = final + (final * (Number(formData.gst_rate) / 100));
            }

            setFormData(prev => ({ ...prev, amount: Math.round(final).toString() }));
        }
    }, [selectedProducts, formData.gst_rate]);

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
                        <div className={styles.formGroup} style={{ position: 'relative' }}>
                            <label>Contact Name</label>
                            <input
                                name="contact_name"
                                value={formData.contact_name}
                                onChange={handleChange}
                                className={styles.input}
                                autoComplete="off"
                                onFocus={() => {
                                    const searchTerm = (formData.contact_name || '').toLowerCase();
                                    const filtered = availableContacts.filter(c =>
                                        (c.name || '').toLowerCase().includes(searchTerm) ||
                                        (c.company_name || '').toLowerCase().includes(searchTerm)
                                    );
                                    setFilteredContacts(filtered.slice(0, 5));
                                    setShowContactSuggestions(true);
                                }}
                                onBlur={() => setTimeout(() => setShowContactSuggestions(false), 200)}
                            />
                            {showContactSuggestions && filteredContacts.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'white',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '0 0 8px 8px',
                                    zIndex: 1000,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    {filteredContacts.map((contact, index) => (
                                        <div
                                            key={contact.id || index}
                                            onClick={() => handleSelectContact(contact)}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f0f0f0',
                                                fontSize: '14px',
                                                fontFamily: 'Open Sauce One, sans-serif'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ fontWeight: '500', color: '#333' }}>{contact.name}</div>
                                            {contact.company_name && (
                                                <div style={{ fontSize: '12px', color: '#666' }}>{contact.company_name}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.formGroup} style={{ position: 'relative' }}>
                            <label>Company Name</label>
                            <input
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleChange}
                                className={styles.input}
                                autoComplete="off"
                                onFocus={() => {
                                    const uniqueCompanies = Array.from(new Set(availableContacts.map(c => c.company_name).filter(Boolean)));
                                    const searchTerm = (formData.company_name || '').toLowerCase();
                                    const filtered = uniqueCompanies.filter(c => c.toLowerCase().includes(searchTerm));
                                    setFilteredCompanies(filtered.slice(0, 5));
                                    setShowCompanySuggestions(true);
                                }}
                                onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
                            />
                            {showCompanySuggestions && filteredCompanies.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'white',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '0 0 8px 8px',
                                    zIndex: 1000,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    {filteredCompanies.map((company, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleSelectCompany(company)}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f0f0f0',
                                                fontSize: '14px',
                                                fontFamily: 'Open Sauce One, sans-serif'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ fontWeight: '500', color: '#333' }}>{company}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: '13px', fontFamily: 'Open Sauce One, sans-serif' }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', borderTopLeftRadius: '8px' }}>Product</th>
                                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>Price</th>
                                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', width: '90px' }}>Qty</th>
                                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', width: '200px' }}>Discount</th>
                                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>Total</th>
                                                <th style={{ padding: '12px', width: '50px', borderBottom: '1px solid #e5e7eb', borderTopRightRadius: '8px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedProducts.map((p, index) => {
                                                const price = Number(p.sale_price || 0);
                                                const qty = Number(p.qty || 1);
                                                const discount = Number(p.discount || 0);
                                                const total = (price * qty) * (1 - discount / 100);
                                                const isLast = index === selectedProducts.length - 1;
                                                return (
                                                    <tr key={p.id} style={{ transition: 'background-color 0.2s' }}>
                                                        <td style={{ padding: '12px 16px', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
                                                            <div style={{ fontWeight: '500', color: '#111827' }}>{p.product_name}</div>
                                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{p.product_code}</div>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right', color: '#374151', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>₹{price}</td>
                                                        <td style={{ padding: '12px', textAlign: 'center', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={qty}
                                                                onChange={(e) => handleProductChange(p.id, 'qty', e.target.value)}
                                                                style={{
                                                                    width: '60px',
                                                                    padding: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    borderRadius: '6px',
                                                                    textAlign: 'center',
                                                                    fontSize: '13px',
                                                                    outline: 'none',
                                                                    color: '#374151',
                                                                    background: '#fff'
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                                <select
                                                                    value={p.discount_type || 'All'}
                                                                    onChange={(e) => handleProductChange(p.id, 'discount_type', e.target.value)}
                                                                    style={{
                                                                        width: '100px',
                                                                        padding: '6px',
                                                                        border: '1px solid #e5e7eb',
                                                                        borderRadius: '6px',
                                                                        fontSize: '12px',
                                                                        color: '#374151',
                                                                        background: '#fff',
                                                                        outline: 'none',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <option value="All">All</option>
                                                                    <option value="Retailer">Retailer</option>
                                                                    <option value="Wholesaler">Wholesaler</option>
                                                                    <option value="Online">Online</option>
                                                                    <option value="Franchise">Franchise</option>
                                                                    <option value="Agent">Agent</option>
                                                                    <option value="Prime">Prime</option>
                                                                </select>
                                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        value={discount}
                                                                        onChange={(e) => handleProductChange(p.id, 'discount', e.target.value)}
                                                                        style={{
                                                                            width: '50px',
                                                                            padding: '6px 20px 6px 6px',
                                                                            border: '1px solid #e5e7eb',
                                                                            borderRadius: '6px',
                                                                            textAlign: 'center',
                                                                            fontSize: '13px',
                                                                            outline: 'none',
                                                                            color: '#374151'
                                                                        }}
                                                                    />
                                                                    <span style={{ position: 'absolute', right: '6px', fontSize: '11px', color: '#9ca3af', pointerEvents: 'none' }}>%</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500', color: '#111827', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>₹{Math.round(total)}</td>
                                                        <td style={{ padding: '12px', textAlign: 'center', borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeProduct(p.id)}
                                                                style={{
                                                                    background: '#fee2e2',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: '#ef4444',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    borderRadius: '4px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <i className="fa-regular fa-trash" style={{ fontSize: '12px' }}></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                                <td colSpan={4} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottomLeftRadius: '8px' }}>Sub Total:</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                                                    ₹{Math.round(selectedProducts.reduce((sum, p) => sum + ((Number(p.sale_price || 0) * (Number(p.qty || 1))) * (1 - (Number(p.discount || 0) / 100))), 0))}
                                                </td>
                                                <td style={{ borderBottomRightRadius: '8px' }}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label>GST Rate</label>
                            <select
                                name="gst_rate"
                                value={(formData as any).gst_rate}
                                onChange={handleChange}
                            >
                                <option value="0">GST @ 0%</option>
                                <option value="5">GST @ 5%</option>
                                <option value="12">GST @ 12%</option>
                                <option value="18">GST @ 18%</option>
                                <option value="28">GST @ 28%</option>
                            </select>
                        </div>

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
