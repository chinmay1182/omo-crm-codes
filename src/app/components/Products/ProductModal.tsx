"use client";

import React, { useState, useEffect } from 'react';
import styles from './ProductModal.module.css';
import toast from 'react-hot-toast';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: any;
    onSuccess: () => void;
    productTags: any[];
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, initialData, onSuccess, productTags }) => {
    const [formData, setFormData] = useState({
        unique_code_manual: '',
        product_name: '',
        product_name_tag: '',
        product_category_tag: '',
        unit_type: 'Pcs',
        qty_in_numbers: 1,
        alt_unit_type: '',
        alt_qty_in_numbers: '',
        purchase_price: '',
        sale_price: '',
        category_discounts: {
            retailer: 0,
            wholesaler: 0,
            online: 0,
            franchise: 0,
            agent: 0,
            prime: 0,
            all: 0
        },
        gst_rate: 18,
        batch_no: '',
        expiry_date: '',
        best_before_months: '',
        opening_qty: 0,
        opening_qty_unit: 'Pcs',
        unit_type_na: false,
        gst_inclusive: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'discounts'>('general');

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            // Reset form
            setFormData({
                unique_code_manual: '',
                product_name: '',
                product_name_tag: '',
                product_category_tag: '',
                unit_type: 'Pcs',
                qty_in_numbers: 1,
                alt_unit_type: '',
                alt_qty_in_numbers: '',
                purchase_price: '',
                sale_price: '',
                category_discounts: {
                    retailer: 0,
                    wholesaler: 0,
                    online: 0,
                    franchise: 0,
                    agent: 0,
                    prime: 0,
                    all: 0
                },
                gst_rate: 18,
                batch_no: '',
                expiry_date: '',
                best_before_months: '',
                opening_qty: 0,
                opening_qty_unit: 'Pcs',
                unit_type_na: false,
                gst_inclusive: false
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Sanitize payload
            const payload = {
                ...formData,
                // Convert to numbers or null if empty
                qty_in_numbers: formData.qty_in_numbers ? Number(formData.qty_in_numbers) : 0,
                alt_qty_in_numbers: formData.alt_qty_in_numbers ? Number(formData.alt_qty_in_numbers) : null,
                purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
                sale_price: formData.sale_price ? Number(formData.sale_price) : 0,
                category_discounts: formData.category_discounts,
                gst_rate: formData.gst_rate ? Number(formData.gst_rate) : 0,
                opening_qty: formData.opening_qty ? Number(formData.opening_qty) : 0,
                best_before_months: formData.best_before_months ? Number(formData.best_before_months) : null,
                // Handle empty date strings
                expiry_date: formData.expiry_date || null
            };

            const url = initialData ? `/api/products/${initialData.id}` : '/api/products';
            const method = initialData ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save product');
            }

            toast.success(initialData ? 'Product updated' : 'Product created');
            onSuccess();
        } catch (error: any) {
            console.error("Form submission error:", error);
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
                    <h2 className={styles.modalTitle}>{initialData ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} className={styles.closeButton}><i className="fa-light fa-xmark"></i></button>
                </div>
                <div className={styles.tabHeader}>
                    <div
                        className={`${styles.tab} ${activeTab === 'general' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General Details
                    </div>
                    <div
                        className={`${styles.tab} ${activeTab === 'discounts' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('discounts')}
                    >
                        Discounts & Pricing
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    {activeTab === 'general' && (
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>Product Name *</label>
                                <input name="product_name" value={formData.product_name} onChange={handleChange} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Manual Unique Code</label>
                                <input name="unique_code_manual" value={formData.unique_code_manual} onChange={handleChange} />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Category Tag</label>
                                <div className={styles.tagContainer}>
                                    {productTags?.filter((t: any) => t.type === 'product_category').map((tag: any) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            className={`${styles.tagButton} ${formData.product_category_tag === tag.name ? styles.tagSelected : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, product_category_tag: tag.name }))}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Name Tag</label>
                                <div className={styles.tagContainer}>
                                    {productTags?.filter((t: any) => t.type === 'product_name').map((tag: any) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            className={`${styles.tagButton} ${formData.product_name_tag === tag.name ? styles.tagSelected : ''}`}
                                            onClick={() => setFormData(prev => ({ ...prev, product_name_tag: tag.name }))}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formGroup} style={{ alignSelf: 'end', marginBottom: '10px' }}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        name="unit_type_na"
                                        checked={formData.unit_type_na}
                                        onChange={handleChange}
                                        className={styles.checkboxInput}
                                    />
                                    Unit Type N.A.
                                </label>
                            </div>

                            {!formData.unit_type_na && (
                                <>
                                    <div className={styles.formGroup}>
                                        <label>Unit Type</label>
                                        <select name="unit_type" value={formData.unit_type} onChange={handleChange}>
                                            <option value="Pcs">Pcs</option>
                                            <option value="Kgs">Kgs</option>
                                            <option value="Ltr">Ltr</option>
                                            <option value="Box">Box</option>
                                            <option value="Packet">Packet</option>
                                            <option value="Dozen">Dozen</option>
                                            <option value="Gm">Gm</option>
                                            <option value="Ml">Ml</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Qty (Numbers)</label>
                                        <input type="number" name="qty_in_numbers" value={formData.qty_in_numbers} onChange={handleChange} />
                                    </div>

                                    <div className={styles.formGroupFull} style={{ marginTop: '10px' }}>
                                        <label>Add Alternative Quantities</label>
                                        <div className={styles.tagContainer}>
                                            {['Box', 'Packet', 'Dozen', 'Gm', 'Kg', 'Ltr', 'Ml', 'Pcs'].map((unit) => (
                                                <button
                                                    key={unit}
                                                    type="button"
                                                    className={`${styles.tagButton} ${formData.alt_unit_type === unit ? styles.tagSelected : ''}`}
                                                    onClick={() => setFormData(prev => ({ ...prev, alt_unit_type: unit }))}
                                                >
                                                    {unit}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Alt Unit Type</label>
                                        <input
                                            type="text"
                                            name="alt_unit_type"
                                            value={formData.alt_unit_type}
                                            onChange={handleChange}
                                            placeholder="Select or type unit"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Alt Qty (Numbers)</label>
                                        <input
                                            type="number"
                                            name="alt_qty_in_numbers"
                                            value={formData.alt_qty_in_numbers}
                                            onChange={handleChange}
                                            placeholder="e.g. 10"
                                        />
                                        {formData.qty_in_numbers && formData.alt_qty_in_numbers && (
                                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                Total Units: {Number(formData.qty_in_numbers) * Number(formData.alt_qty_in_numbers)}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className={styles.formGroup}>
                                <label>Sale Price *</label>
                                <input type="number" name="sale_price" value={formData.sale_price} onChange={handleChange} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Purchase Price</label>
                                <input type="number" name="purchase_price" value={formData.purchase_price} onChange={handleChange} />
                            </div>

                            <div className={styles.formGroup} style={{ alignSelf: 'end', marginBottom: '10px' }}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        name="gst_inclusive"
                                        checked={Boolean(formData.gst_inclusive)}
                                        onChange={handleChange}
                                        className={styles.checkboxInput}
                                    />
                                    Inclusive GST
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label>GST Rate</label>
                                <select
                                    name="gst_rate"
                                    value={formData.gst_rate}
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
                                <label>Batch No</label>
                                <input name="batch_no" value={formData.batch_no} onChange={handleChange} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Expiry Date</label>
                                <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Opening Qty</label>
                                <input type="number" name="opening_qty" value={formData.opening_qty} onChange={handleChange} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'discounts' && (
                        <div className={styles.formGrid}>
                            <div className={styles.formGroupFull}>
                                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                                    <p style={{ margin: 0, color: '#166534', fontSize: '14px' }}>
                                        <i className="fa-regular fa-circle-info" style={{ marginRight: '8px' }}></i>
                                        Set default discounts for each customer category. These will be automatically applied when creating quotations.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Standard/Default Discount (%)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        value={formData.category_discounts?.all || 0}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            category_discounts: { ...prev.category_discounts, all: Number(e.target.value) }
                                        }))}
                                        style={{ background: '#fff' }}
                                    />
                                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>%</span>
                                </div>
                            </div>

                            <div className={styles.formGroup}></div> {/* Spacer */}

                            <div className={styles.formGroupFull}>
                                <label style={{ marginBottom: '15px', display: 'block', fontWeight: '500', color: '#15426d' }}>Category Specific Discounts</label>
                                <div className={styles.formGrid}>
                                    {['Retailer', 'Wholesaler', 'Online', 'Franchise', 'Agent', 'Prime'].map((cat) => (
                                        <div className={styles.formGroup} key={cat}>
                                            <label>{cat}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={(formData.category_discounts as any)?.[cat.toLowerCase()] || 0}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        category_discounts: { ...prev.category_discounts, [cat.toLowerCase()]: Number(e.target.value) }
                                                    }))}
                                                    style={{ background: '#fff' }}
                                                />
                                                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}


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

export default ProductModal;
