'use client';

import React, { useState } from 'react';
import styles from './ProductSettingsModal.module.css';
import toast from 'react-hot-toast';

interface ProductTag {
    id: string;
    name: string;
    type: 'product_name' | 'product_category';
}

interface ProductSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productTags: ProductTag[];
}

const ProductSettingsModal: React.FC<ProductSettingsModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    productTags
}) => {
    const [newProductName, setNewProductName] = useState('');
    const [newProductCategory, setNewProductCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [localProductTags, setLocalProductTags] = useState<ProductTag[]>(productTags);

    const productNameTags = localProductTags.filter(tag => tag.type === 'product_name');
    const productCategoryTags = localProductTags.filter(tag => tag.type === 'product_category');

    // Update local tags when props change
    React.useEffect(() => {
        setLocalProductTags(productTags);
    }, [productTags]);

    const refreshTags = async () => {
        try {
            const response = await fetch('/api/product-tags');
            if (response.ok) {
                const data = await response.json();
                setLocalProductTags(data);
            }
        } catch (error) {
            console.error('Error refreshing tags:', error);
        }
    };

    const handleAddProductName = async () => {
        if (!newProductName.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/product-tags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newProductName.trim(),
                    type: 'product_name'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add product name');
            }

            toast.success('Product name added successfully');
            setNewProductName('');
            await refreshTags();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add product name');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddProductCategory = async () => {
        if (!newProductCategory.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/product-tags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newProductCategory.trim(),
                    type: 'product_category'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add product category');
            }

            toast.success('Product category added successfully');
            setNewProductCategory('');
            await refreshTags();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add product category');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTag = async (tagId: string, tagName: string) => {
        if (!confirm(`Are you sure you want to delete "${tagName}"?`)) return;

        try {
            const response = await fetch(`/api/product-tags/${tagId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete tag');
            }

            toast.success('Tag deleted successfully');
            await refreshTags();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete tag');
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Product Settings</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <i className="fa-light fa-xmark"></i>
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.sectionsContainer}>
                        {/* Product Names Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                Product Names
                            </h3>

                            <div className={styles.addItemContainer}>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={newProductName}
                                        onChange={(e) => setNewProductName(e.target.value)}
                                        placeholder="Add new product name..."
                                        className={styles.input}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddProductName()}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddProductName}
                                    className={styles.addButton}
                                    disabled={!newProductName.trim() || isSubmitting}
                                >
                                    <i className="fa-light fa-plus"></i>
                                </button>
                            </div>

                            <div className={styles.tagsList}>
                                {productNameTags.length === 0 ? (
                                    <p className={styles.emptyMessage}>No product names added yet</p>
                                ) : (
                                    productNameTags.map((tag) => (
                                        <div key={tag.id} className={styles.tag}>
                                            <span className={styles.tagText}>{tag.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTag(tag.id, tag.name)}
                                                className={styles.removeButton}
                                                title="Delete tag"
                                            >
                                                <span style={{ fontSize: '12px', fontWeight: '400' }}>Delete</span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Product Categories Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                Product Categories
                            </h3>

                            <div className={styles.addItemContainer}>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={newProductCategory}
                                        onChange={(e) => setNewProductCategory(e.target.value)}
                                        placeholder="Add new product category..."
                                        className={styles.input}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddProductCategory()}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddProductCategory}
                                    className={styles.addButton}
                                    disabled={!newProductCategory.trim() || isSubmitting}
                                >
                                    <i className="fa-light fa-plus"></i>
                                </button>
                            </div>

                            <div className={styles.tagsList}>
                                {productCategoryTags.length === 0 ? (
                                    <p className={styles.emptyMessage}>No product categories added yet</p>
                                ) : (
                                    productCategoryTags.map((tag) => (
                                        <div key={tag.id} className={styles.tag}>
                                            <span className={styles.tagText}>{tag.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTag(tag.id, tag.name)}
                                                className={styles.removeButton}
                                                title="Delete tag"
                                            >
                                                <span style={{ fontSize: '12px', fontWeight: '400' }}>Delete</span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            onClick={() => {
                                onSuccess(); // Call this to refresh parent component
                                onClose();
                            }}
                            className={styles.cancelButton}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductSettingsModal;
