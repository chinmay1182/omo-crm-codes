import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import Image from 'next/image';
import styles from './CompanySettingsModal.module.css';
import toast from 'react-hot-toast';

interface CompanySettingsModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    user: any;
}

// Add Indian States list
const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Lakshadweep", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

export default function CompanySettingsModal({ isOpen, onRequestClose, user }: CompanySettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'company' | 'company_seal' | 'company_details'>('company');

    // Company Logo States
    const [selectedCompanyLogo, setSelectedCompanyLogo] = useState<string | null>(null);
    const [isCompanyLogoUploading, setIsCompanyLogoUploading] = useState(false);

    // Company Seal States
    const [selectedCompanySeal, setSelectedCompanySeal] = useState<string | null>(null);
    const [isCompanySealUploading, setIsCompanySealUploading] = useState(false);

    // Company Details States
    const [companyDetailsData, setCompanyDetailsData] = useState({
        companyName: '',
        street: '',
        street2: '',
        landmark: '',
        state: '',
        city: '',
        pincode: '',
        email: '',
        companyPhone: '',
        contactPerson: '',
        cin: ''
    });

    useEffect(() => {
        if (isOpen) {
            // Load initial values from user prop
            if (user?.company_logo) {
                setSelectedCompanyLogo(user.company_logo);
            }
            if (user?.company_seal) {
                setSelectedCompanySeal(user.company_seal);
            }

            // Fetch Company Details
            if (user?.id) {
                fetch(`/api/agent-company-details?agentId=${user.id}`)
                    .then(res => {
                        if (res.ok) return res.json();
                        throw new Error('Failed to fetch');
                    })
                    .then(data => {
                        if (data) {
                            setCompanyDetailsData({
                                companyName: data.company_name || '',
                                street: data.address_street || '',
                                street2: data.address_street_2 || '',
                                landmark: data.address_landmark || '',
                                state: data.address_state || '',
                                city: data.address_city || '',
                                pincode: data.address_pincode || '',
                                email: data.company_email || '',
                                companyPhone: data.company_phone || '',
                                contactPerson: data.contact_person || '',
                                cin: data.cin || ''
                            });
                        }
                    })
                    .catch(err => console.error('Error fetching company details:', err));
            }
        }
    }, [isOpen, user]);

    // Handle company logo upload
    const handleCompanyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsCompanyLogoUploading(true);
        try {
            const res = await fetch('/api/company-profile-icons/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedCompanyLogo(`/company-profile-icons/${data.filename}`);
                toast.success('Logo uploaded successfully');
            } else {
                toast.error('Failed to upload logo');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error uploading logo');
        } finally {
            setIsCompanyLogoUploading(false);
        }
    };

    // Handle company seal upload
    const handleCompanySealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsCompanySealUploading(true);
        try {
            const res = await fetch('/api/company-profile-icons/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedCompanySeal(`/company-profile-icons/${data.filename}`);
                toast.success('Seal uploaded successfully');
            } else {
                toast.error('Failed to upload seal');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error uploading seal');
        } finally {
            setIsCompanySealUploading(false);
        }
    };

    const saveCompanySeal = async () => {
        if (!selectedCompanySeal) return;
        if (!user || !user.id) {
            toast.error('User not identified');
            return;
        }

        try {
            const res = await fetch('/api/agent-auth/update-company-seal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: user.id,
                    companySeal: selectedCompanySeal
                })
            });

            if (res.ok) {
                toast.success('Company seal updated successfully! Refreshing...');
                onRequestClose();
                window.location.reload();
            } else {
                toast.error('Failed to update company seal');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error updating company seal');
        }
    };

    const saveCompanyLogo = async () => {
        if (!selectedCompanyLogo) return;
        if (!user || !user.id) {
            toast.error('User not identified');
            return;
        }

        try {
            const res = await fetch('/api/agent-auth/update-company-logo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: user.id,
                    companyLogo: selectedCompanyLogo
                })
            });

            if (res.ok) {
                toast.success('Company logo updated successfully! Refreshing...');
                onRequestClose();
                window.location.reload();
            } else {
                toast.error('Failed to update company logo');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error updating company logo');
        }
    };

    const saveCompanyDetails = async () => {
        if (!user || !user.id) {
            toast.error('User not identified');
            return;
        }

        try {
            const res = await fetch('/api/agent-company-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: user.id,
                    ...companyDetailsData
                })
            });

            if (res.ok) {
                toast.success('Company details updated successfully!');
                onRequestClose();
            } else {
                toast.error('Failed to update company details');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error updating company details');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCompanyDetailsData(prev => ({
            ...prev,
            [name]: value
        }));
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
        >
            <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Company Settings</h3>
                <button
                    className={styles.closeButton}
                    onClick={onRequestClose}
                >
                    <i className="fa-light fa-xmark"></i>
                </button>
            </div>

            <div className={styles.tabsContainer}>
                <button
                    onClick={() => setActiveTab('company')}
                    className={`${styles.tabButton} ${activeTab === 'company' ? styles.activeTab : ''}`}
                >
                    Company Logo
                </button>
                <button
                    onClick={() => setActiveTab('company_seal')}
                    className={`${styles.tabButton} ${activeTab === 'company_seal' ? styles.activeTab : ''}`}
                >
                    Company Seal
                </button>
                <button
                    onClick={() => setActiveTab('company_details')}
                    className={`${styles.tabButton} ${activeTab === 'company_details' ? styles.activeTab : ''}`}
                >
                    Company Details
                </button>
            </div>

            <div className={styles.modalBody}>
                {activeTab === 'company' && (
                    <div className={styles.uploadSection}>
                        <p className={styles.uploadLabel}>Upload Company Logo</p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCompanyLogoUpload}
                            disabled={isCompanyLogoUploading}
                            className={styles.fileInput}
                        />
                        {isCompanyLogoUploading && <span className={styles.uploadingText}>Uploading...</span>}

                        {selectedCompanyLogo && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <p className={styles.sectionTitle}>Preview:</p>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    margin: '0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px'
                                }}>
                                    <Image
                                        src={selectedCompanyLogo}
                                        alt="Selected Logo"
                                        width={80}
                                        height={80}
                                        style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                                        unoptimized
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'company_seal' && (
                    <div className={styles.uploadSection}>
                        <p className={styles.uploadLabel}>Upload Company Seal</p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleCompanySealUpload}
                            disabled={isCompanySealUploading}
                            className={styles.fileInput}
                        />
                        {isCompanySealUploading && <span className={styles.uploadingText}>Uploading...</span>}

                        {selectedCompanySeal && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <p className={styles.sectionTitle}>Preview:</p>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    margin: '0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px'
                                }}>
                                    <Image
                                        src={selectedCompanySeal}
                                        alt="Selected Seal"
                                        width={80}
                                        height={80}
                                        style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                                        unoptimized
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'company_details' && (
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Company Name</label>
                            <input
                                type="text"
                                name="companyName"
                                value={companyDetailsData.companyName}
                                onChange={handleInputChange}
                                placeholder="Enter Company Name"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={companyDetailsData.email}
                                onChange={handleInputChange}
                                placeholder="Enter Email"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Phone Number</label>
                            <input
                                type="text"
                                name="companyPhone"
                                value={companyDetailsData.companyPhone}
                                onChange={handleInputChange}
                                placeholder="Enter Phone Number"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Contact Person</label>
                            <input
                                type="text"
                                name="contactPerson"
                                value={companyDetailsData.contactPerson}
                                onChange={handleInputChange}
                                placeholder="Enter Contact Person"
                            />
                        </div>

                        <div className={styles.formGroupFull}>
                            <div className={styles.formGroup}>
                                <label>Street Address</label>
                                <input
                                    type="text"
                                    name="street"
                                    value={companyDetailsData.street}
                                    onChange={handleInputChange}
                                    placeholder="House/Flat/Block No, Street Name"
                                    style={{ marginBottom: '10px' }}
                                />
                                <input
                                    type="text"
                                    name="street2"
                                    value={companyDetailsData.street2}
                                    onChange={handleInputChange}
                                    placeholder="Apartment, Studio, or Floor (Optional)"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Landmark</label>
                            <input
                                type="text"
                                name="landmark"
                                value={companyDetailsData.landmark}
                                onChange={handleInputChange}
                                placeholder="Near..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>State</label>
                            <select name="state" value={companyDetailsData.state} onChange={handleInputChange}>
                                <option value="">Select State</option>
                                {INDIAN_STATES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>City</label>
                            <input
                                type="text"
                                name="city"
                                value={companyDetailsData.city}
                                onChange={handleInputChange}
                                placeholder="Enter City"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                value={companyDetailsData.pincode}
                                onChange={handleInputChange}
                                placeholder="Enter Pincode"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>CIN</label>
                            <input
                                type="text"
                                name="cin"
                                value={companyDetailsData.cin}
                                onChange={handleInputChange}
                                placeholder="Corporate Identification Number"
                            />
                        </div>
                    </div>
                )}
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
                    onClick={() => {
                        if (activeTab === 'company') saveCompanyLogo();
                        else if (activeTab === 'company_seal') saveCompanySeal();
                        else saveCompanyDetails();
                    }}
                >
                    Save Changes
                </button>
            </div>
        </Modal>
    );
}
