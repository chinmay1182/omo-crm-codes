
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import Image from 'next/image';
import styles from './ProfileSettingsModal.module.css';
import toast from 'react-hot-toast';

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    user: any;
    // We pass setters or refresh trigger if needed, but the original logic reloaded the page.
    // For now we will replicate the page reload on success.
}

export default function ProfileSettingsModal({ isOpen, onRequestClose, user }: ProfileSettingsModalProps) {
    const [profileModalTab, setProfileModalTab] = useState<'profile' | 'company'>('profile');

    // Profile Icon States
    const [availableIcons, setAvailableIcons] = useState<string[]>([]);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Company Logo States
    // No library search for company logo as requested - just upload
    const [selectedCompanyLogo, setSelectedCompanyLogo] = useState<string | null>(null);
    const [isCompanyLogoUploading, setIsCompanyLogoUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Load initial values from user prop
            if (user?.profile_image) {
                setSelectedIcon(user.profile_image);
            }
            if (user?.company_logo) {
                setSelectedCompanyLogo(user.company_logo);
            }

            // Fetch Profile Icons (only for profile tab)
            fetch('/api/profile-icons')
                .then(res => res.json())
                .then(data => {
                    if (data.icons) setAvailableIcons(data.icons);
                })
                .catch(err => console.error('Error fetching icons:', err));
        }
    }, [isOpen, user]);

    // Handle profile file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const res = await fetch('/api/profile-icons/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setAvailableIcons(prev => [data.filename, ...prev]);
                setSelectedIcon(`/profile-icons/${data.filename}`);
                toast.success('Image uploaded successfully');
            } else {
                toast.error('Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error uploading image');
        } finally {
            setIsUploading(false);
        }
    };

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
                // We directly set the selected logo path since there's no library list for company logos anymore
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

    // Save functions
    const saveProfileImage = async () => {
        if (!selectedIcon) return;
        if (!user || !user.id) {
            toast.error('User not identified');
            return;
        }

        try {
            const res = await fetch('/api/agent-auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: user.id,
                    profileImage: selectedIcon
                })
            });

            if (res.ok) {
                toast.success('Profile updated successfully! Refreshing...');
                onRequestClose();
                window.location.reload();
            } else {
                toast.error('Failed to update profile');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Error updating profile');
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
                <h3 className={styles.modalTitle}>Profile Settings</h3>
                <button
                    className={styles.closeButton}
                    onClick={onRequestClose}
                >
                    <i className="fa-light fa-xmark"></i>
                </button>
            </div>

            <div className={styles.tabsContainer}>
                <button
                    onClick={() => setProfileModalTab('profile')}
                    className={`${styles.tabButton} ${profileModalTab === 'profile' ? styles.activeTab : ''}`}
                >
                    Profile Picture
                </button>
                <button
                    onClick={() => setProfileModalTab('company')}
                    className={`${styles.tabButton} ${profileModalTab === 'company' ? styles.activeTab : ''}`}
                >
                    Company Logo
                </button>
            </div>

            <div className={styles.modalBody}>
                {profileModalTab === 'profile' ? (
                    <>
                        <div className={styles.uploadSection}>
                            <p className={styles.uploadLabel}>Upload New Image</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className={styles.fileInput}
                            />
                            {isUploading && <span className={styles.uploadingText}>Uploading...</span>}
                        </div>

                        <h4 className={styles.sectionTitle}>Select from library:</h4>

                        <div className={styles.iconGrid}>
                            {availableIcons.length > 0 ? availableIcons.map((icon) => {
                                const iconPath = `/profile-icons/${icon}`;
                                const isSelected = selectedIcon === iconPath;
                                return (
                                    <div
                                        key={icon}
                                        className={`${styles.iconOption} ${isSelected ? styles.selected : ''}`}
                                        onClick={() => setSelectedIcon(iconPath)}
                                    >
                                        <Image
                                            src={iconPath}
                                            alt={icon}
                                            width={70}
                                            height={70}
                                            className={styles.iconImage}
                                            unoptimized
                                        />
                                    </div>
                                );
                            }) : (
                                <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '20px' }}>No icons found in folder</p>
                            )}
                        </div>
                    </>
                ) : (
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
                    onClick={profileModalTab === 'profile' ? saveProfileImage : saveCompanyLogo}
                >
                    Save Changes
                </button>
            </div>
        </Modal>
    );
}
