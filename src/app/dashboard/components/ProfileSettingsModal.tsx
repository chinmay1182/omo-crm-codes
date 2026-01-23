import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import Image from 'next/image';
import styles from './ProfileSettingsModal.module.css';
import toast from 'react-hot-toast';

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    user: any;
}

export default function ProfileSettingsModal({ isOpen, onRequestClose, user }: ProfileSettingsModalProps) {
    // Profile Icon States
    const [availableIcons, setAvailableIcons] = useState<string[]>([]);
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Load initial values from user prop
            if (user?.profile_image) {
                setSelectedIcon(user.profile_image);
            }

            // Fetch Profile Icons
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
                <h3 className={styles.modalTitle}>User Profile Settings</h3>
                <button
                    className={styles.closeButton}
                    onClick={onRequestClose}
                >
                    <i className="fa-light fa-xmark"></i>
                </button>
            </div>

            <div className={styles.modalBody}>
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
                    onClick={saveProfileImage}
                >
                    Save Changes
                </button>
            </div>
        </Modal>
    );
}
