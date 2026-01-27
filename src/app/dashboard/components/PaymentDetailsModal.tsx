import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from './PaymentDetailsModal.module.css';
import toast from 'react-hot-toast';

interface PaymentDetailsModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    user: any;
}

export default function PaymentDetailsModal({ isOpen, onRequestClose, user }: PaymentDetailsModalProps) {
    const [paymentData, setPaymentData] = useState({
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        upiId: ''
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchPaymentDetails();
        }
    }, [isOpen, user]);

    const fetchPaymentDetails = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/agent-payment-details?agentId=${user.id}`);
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setPaymentData({
                        bankName: data.bank_name || '',
                        accountNumber: data.account_number || '',
                        ifscCode: data.ifsc_code || '',
                        accountHolderName: data.account_holder_name || '',
                        upiId: data.upi_id || ''
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching payment details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPaymentData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        if (!user?.id) {
            toast.error('User not identified');
            return;
        }

        try {
            const response = await fetch('/api/agent-payment-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentId: user.id,
                    ...paymentData
                }),
            });

            if (response.ok) {
                toast.success('Payment details saved successfully');
                onRequestClose();
            } else {
                toast.error('Failed to save payment details');
            }
        } catch (error) {
            console.error('Error saving payment details:', error);
            toast.error('An error occurred while saving');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className={styles.modal}
            overlayClassName={styles.modalOverlay}
            style={{
                overlay: {
                    zIndex: 99999
                }
            }}
            ariaHideApp={false}
        >
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Payment Details</h3>
                <button
                    className={styles.closeButton}
                    onClick={onRequestClose}
                >
                    <i className="fa-light fa-xmark"></i>
                </button>
            </div>

            <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Account Holder Name</label>
                        <input
                            type="text"
                            name="accountHolderName"
                            value={paymentData.accountHolderName}
                            onChange={handleInputChange}
                            placeholder="Enter Account Holder Name"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Bank Name</label>
                        <input
                            type="text"
                            name="bankName"
                            value={paymentData.bankName}
                            onChange={handleInputChange}
                            placeholder="Enter Bank Name"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Account Number</label>
                        <input
                            type="text"
                            name="accountNumber"
                            value={paymentData.accountNumber}
                            onChange={handleInputChange}
                            placeholder="Enter Account Number"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>IFSC Code</label>
                        <input
                            type="text"
                            name="ifscCode"
                            value={paymentData.ifscCode}
                            onChange={handleInputChange}
                            placeholder="Enter IFSC Code"
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>UPI ID (Optional)</label>
                        <input
                            type="text"
                            name="upiId"
                            value={paymentData.upiId}
                            onChange={handleInputChange}
                            placeholder="Enter UPI ID"
                        />
                    </div>
                </div>
            </div>

            <div className={styles.modalActions}>
                <button
                    className={styles.cancelBtn}
                    onClick={onRequestClose}
                >
                    Cancel
                </button>
                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                >
                    Update Details
                </button>
            </div>
        </Modal>
    );
}
