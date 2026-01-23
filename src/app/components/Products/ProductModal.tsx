"use client";

import React, { useState, useEffect } from 'react';
import styles from './ProductModal.module.css';
import toast from 'react-hot-toast';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: any;
    onSuccess: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, initialData, onSuccess }) => {
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
        discount_type: 'All',
        discount_value: 0,
        batch_no: '',
        expiry_date: '',
        best_before_months: '',
        opening_qty: 0,
        opening_qty_unit: 'Pcs',
        unit_type_na: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                discount_type: 'All',
                discount_value: 0,
                batch_no: '',
                expiry_date: '',
                best_before_months: '',
                opening_qty: 0,
                opening_qty_unit: 'Pcs',
                unit_type_na: false
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
            const url = initialData ? `/api/products/${initialData.id}` : '/api/products';
            const method = initialData ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save product');

            toast.success(initialData ? 'Product updated' : 'Product created');
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
                    <h2 className={styles.modalTitle}>{initialData ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} className={styles.closeButton}><i className="fa-light fa-xmark"></i></button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalBody}>
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
                            <input name="product_category_tag" value={formData.product_category_tag} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Name Tag</label>
                            <input name="product_name_tag" value={formData.product_name_tag} onChange={handleChange} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Unit Type</label>
                            <select name="unit_type" value={formData.unit_type} onChange={handleChange}>
                                <option value="Pcs">Pcs</option>
                                <option value="Kgs">Kgs</option>
                                <option value="Ltr">Ltr</option>
                                <option value="Box">Box</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Qty (Numbers)</label>
                            <input type="number" name="qty_in_numbers" value={formData.qty_in_numbers} onChange={handleChange} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Sale Price *</label>
                            <input type="number" name="sale_price" value={formData.sale_price} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Purchase Price</label>
                            <input type="number" name="purchase_price" value={formData.purchase_price} onChange={handleChange} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Discount Type</label>
                            <select name="discount_type" value={formData.discount_type} onChange={handleChange}>
                                <option value="All">All</option>
                                <option value="Retailer">Retailer</option>
                                <option value="Wholesaler">Wholesaler</option>
                                <option value="Online">Online</option>
                                <option value="Franchise">Franchise</option>
                                <option value="Agent">Agent</option>
                                <option value="Prime">Prime</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Discount (%)</label>
                            <input type="number" name="discount_value" value={formData.discount_value} onChange={handleChange} />
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

                        <div className={styles.formGroup} style={{ alignSelf: 'end' }}>
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

export default ProductModal;
