"use client";

import { useState, useEffect } from 'react';
import ProductModal from './ProductModal';
import styles from './ProductList.module.css';
import toast from 'react-hot-toast';

interface Product {
    id: string;
    product_code: string;
    unique_code_manual: string;
    product_name: string;
    product_category_tag: string;
    unit_type: string;
    sale_price: number;
    qty_in_numbers: number;
    created_at: string;
    // ... other fields
}

export default function ProductList() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            setProducts(data);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    fetchProducts();
                    toast.success('Product deleted successfully');
                } else {
                    throw new Error('Failed to delete product');
                }
            } catch (err: any) {
                toast.error(err.message);
            }
        }
    };

    const handleEdit = (product: Product) => {
        setCurrentProduct(product);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setCurrentProduct(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
        fetchProducts();
    };

    const filteredProducts = products.filter(p =>
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExport = () => {
        const csvContent = [
            ["Product Code", "Name", "Category", "Unit", "Sale Price", "Qty", "Created At"],
            ...filteredProducts.map(p => [
                p.product_code,
                p.product_name,
                p.product_category_tag,
                p.unit_type,
                p.sale_price,
                p.qty_in_numbers,
                new Date(p.created_at).toLocaleDateString()
            ].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) return <div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Loading Products...</p></div>;
    if (error) return <div className={styles.error}>Error: {error}</div>;

    return (
        <div className={styles.container}>
            <div className={styles.topNav}>
                <div className={styles.searchWrapper}>
                    <i className={`fa-sharp fa-thin fa-search ${styles.searchIcon}`}></i>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <button
                    onClick={handleExport}
                    className={styles.tagsButton}
                    title="Export Products"
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
                            <th>Product Code</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th>Sale Price</th>
                            <th>Qty</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                                <tr key={product.id}>
                                    <td>{product.product_code}</td>
                                    <td>{product.product_name}</td>
                                    <td>{product.product_category_tag}</td>
                                    <td>{product.unit_type}</td>
                                    <td>₹{product.sale_price}</td>
                                    <td>{product.qty_in_numbers}</td>
                                    <td className={styles.actions}>
                                        <button onClick={() => handleEdit(product)} className={styles.editButton}>Edit</button>
                                        <button onClick={() => handleDelete(product.id)} className={styles.deleteButton}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} className={styles.noResults}>No products found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <button onClick={handleAddNew} className={styles.floatingButton} title="Add New Product">
                <i className="fa-light fa-plus"></i>
            </button>

            <ProductModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialData={currentProduct}
                onSuccess={handleCloseModal}
            />
        </div>
    );
}
