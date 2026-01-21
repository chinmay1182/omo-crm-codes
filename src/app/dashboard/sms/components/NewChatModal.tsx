"use client";

import { useState, useEffect } from "react";
import styles from "./NewChatModal.module.css";
import toast from "react-hot-toast";

interface Contact {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    mobile: string;
    company_name?: string;
}

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartChat: (phoneNumber: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onStartChat }: NewChatModalProps) {
    const [activeTab, setActiveTab] = useState<"contacts" | "number">("contacts");
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [countryCode, setCountryCode] = useState("+91");

    useEffect(() => {
        if (isOpen && activeTab === "contacts") {
            fetchContacts();
        }
    }, [isOpen, activeTab]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/contacts");
            if (response.ok) {
                const data = await response.json();
                // Filter out contacts without phone numbers
                const validContacts = data.filter(
                    (c: Contact) => c.phone || c.mobile
                );
                setContacts(validContacts);
            }
        } catch (error) {
            console.error("Error fetching contacts:", error);
            toast.error("Failed to load contacts");
        } finally {
            setLoading(false);
        }
    };

    const cleanPhoneNumber = (num: string) => {
        return num.replace(/\D/g, ""); // Remove non-numeric characters
    };

    const handleStartChatWithNumber = () => {
        if (!phoneNumber.trim()) {
            toast.error("Please enter a phone number");
            return;
        }

        // Simple validation
        const cleaned = cleanPhoneNumber(phoneNumber);
        if (cleaned.length < 10) {
            toast.error("Please enter a valid phone number");
            return;
        }

        let finalNumber = phoneNumber;
        if (!phoneNumber.startsWith("+")) {
            // If no plus, assume country code is needed if length is 10
            if (cleaned.length === 10) {
                finalNumber = `${countryCode}${cleaned}`;
            } else {
                // If length > 10, maybe it has country code but no +, let's assume it's fine or user needs to add +
                // Actually current logic in page.tsx adds +91 if length is 10
                finalNumber = `+${cleaned}`;
            }
        }

        onStartChat(finalNumber);
        onClose();
    };

    const handleContactSelect = (contact: Contact) => {
        const number = contact.mobile || contact.phone;
        if (!number) {
            toast.error("This contact has no phone number");
            return;
        }

        // Check if number is masked
        if (number.includes("*")) {
            toast.error("Cannot start chat with masked number. Please request access to view unmasked data.");
            return;
        }

        onStartChat(number);
        onClose();
    };

    const filteredContacts = contacts.filter((contact) => {
        const searchLower = searchQuery.toLowerCase();
        const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.toLowerCase();
        const company = (contact.company_name || "").toLowerCase();
        const phone = (contact.phone || "").toLowerCase();
        const mobile = (contact.mobile || "").toLowerCase();

        return (
            fullName.includes(searchLower) ||
            company.includes(searchLower) ||
            phone.includes(searchLower) ||
            mobile.includes(searchLower)
        );
    });

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Start New Chat</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        &times;
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "contacts" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("contacts")}
                    >
                        Select Contact
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "number" ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab("number")}
                    >
                        Enter Number
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === "contacts" && (
                        <>
                            <div className={styles.searchBar}>
                                <i className={`fa-light fa-search ${styles.searchIcon}`}></i>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search contacts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {loading ? (
                                <div className={styles.loading}>
                                    <i className="fa-duotone fa-spinner-third fa-spin"></i>
                                </div>
                            ) : (
                                <div className={styles.contactList}>
                                    {filteredContacts.length === 0 ? (
                                        <div className={styles.emptyState}>No contacts found</div>
                                    ) : (
                                        filteredContacts.map((contact) => (
                                            <div
                                                key={contact.id}
                                                className={styles.contactItem}
                                                onClick={() => handleContactSelect(contact)}
                                            >
                                                <div className={styles.contactAvatar}>
                                                    {(contact.first_name || contact.company_name || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div className={styles.contactInfo}>
                                                    <div className={styles.contactName}>
                                                        {contact.first_name || contact.last_name
                                                            ? `${contact.first_name || ""} ${contact.last_name || ""}`
                                                            : contact.company_name || "Unknown"}
                                                    </div>
                                                    <div className={styles.contactPhone}>
                                                        {contact.mobile || contact.phone}
                                                        {contact.company_name && (contact.first_name || contact.last_name) && (
                                                            <span style={{ marginLeft: "8px", opacity: 0.7 }}>• {contact.company_name}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === "number" && (
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Phone Number</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    style={{ width: '60px' }}
                                    className={styles.input}
                                    disabled
                                />
                                <input
                                    type="tel"
                                    className={styles.input}
                                    placeholder="Enter 10 digit number"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    maxLength={15}
                                    autoFocus
                                />
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                                Enter the number without country code
                            </p>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    {activeTab === "number" && (
                        <button
                            className={styles.submitButton}
                            onClick={handleStartChatWithNumber}
                            disabled={!phoneNumber}
                        >
                            Start Chat
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
