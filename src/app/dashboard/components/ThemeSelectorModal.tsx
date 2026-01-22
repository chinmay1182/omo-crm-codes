'use client';

import React from 'react';
import Image from 'next/image';

interface ThemeSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTheme: string;
    setSelectedTheme: (theme: string) => void;
}

const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose, selectedTheme, setSelectedTheme }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(2px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    maxWidth: '800px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 300, fontFamily: 'Open Sauce One' }}>Select Theme</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f5f5f5',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            color: '#666'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '24px',
                    justifyContent: 'center'
                }}>
                    {['Group 1.png', 'Group 2.png', 'Group 3.png', 'Group 4.png'].map((theme) => (
                        <div
                            key={theme}
                            onClick={() => setSelectedTheme(theme)}
                            style={{
                                cursor: 'pointer',
                                width: '80px',
                                height: '80px',
                                border: selectedTheme === theme ? '3px solid #11a454' : '2px solid #e0e0e0',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'all 0.2s',
                                position: 'relative',
                                backgroundImage: `url(/themes/${theme})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {selectedTheme === theme && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: 'rgba(17, 164, 84, 0.9)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    fontWeight: 'bold'
                                }}>
                                    ✓
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#f5f5f5',
                            color: '#333',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontFamily: 'Open Sauce One',
                            fontSize: '14px',
                            fontWeight: 300
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            localStorage.setItem('selectedTheme', selectedTheme);
                            onClose();
                            alert('Theme applied successfully!');
                        }}
                        style={{
                            backgroundColor: '#11a454',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontFamily: 'Open Sauce One',
                            fontSize: '14px',
                            fontWeight: 300
                        }}
                    >
                        Apply Theme
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeSelectorModal;
