
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './GlobalSearch.module.css';
import Spinner from '../../Spinner/Spinner';

interface SearchResult {
    type: 'contact' | 'company' | 'ticket' | 'lead' | 'task' | 'appointment' | 'form' | 'meeting' | 'note' | 'proposal' | 'service' | 'agent' | 'email' | 'feedback' | 'location' | 'payment' | 'refund' | 'setting';
    id: string | number;
    title: string;
    subtitle: string;
    url: string;
    icon: string;
}

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Debounce query to avoid hitting API on every keystroke
    // If useDebounce hook doesn't exist, I'll use a local useEffect implementation
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.trim().length === 0) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/global-search?q=${encodeURIComponent(debouncedQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen || debouncedQuery.length > 0) {
            fetchResults();
        }
    }, [debouncedQuery]);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleFocus = () => {
        if (query.trim().length > 0) {
            setIsOpen(true);
        }
    };

    const handleResultClick = () => {
        setIsOpen(false);
        setQuery(''); // Optional: clear search after navigation
    };

    // Group results by type
    const groupedResults = results.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
    }, {} as Record<string, SearchResult[]>);

    const typeLabels: Record<string, string> = {
        contact: 'Contacts',
        company: 'Companies',
        ticket: 'Tickets',
        lead: 'Leads',
        task: 'Tasks',
        appointment: 'Appointments',
        form: 'Forms',
        meeting: 'Meetings',
        note: 'Notes',
        proposal: 'Proposals',
        service: 'Services',
        agent: 'Agents',
        email: 'Emails',
        feedback: 'Feedbacks',
        location: 'Locations',
        payment: 'Payment History',
        refund: 'Refunds',
        setting: 'Settings'
    };

    // Helper to map font-awesome icons or similar
    // Project uses font-awesome 'fa-thin', 'fa-sharp' etc.
    const getIconClass = (type: string) => {
        switch (type) {
            case 'contact': return 'fa-user';
            case 'company': return 'fa-building';
            case 'ticket': return 'fa-ticket';
            case 'lead': return 'fa-user-plus';
            case 'task': return 'fa-check-circle';
            default: return 'fa-search';
        }
    };

    return (
        <div className={styles.searchWrapper} ref={wrapperRef}>
            <i className={`fa-sharp fa-thin fa-search ${styles.searchIcon}`}></i>
            <input
                type="text"
                placeholder="Search everything..."
                className={styles.searchInput}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={handleFocus}
            />

            {isOpen && query.trim().length > 0 && (
                <div className={styles.searchResultsDropdown}>
                    {isLoading ? (
                        <div className={styles.loadingSpinner}>
                            <Spinner size="small" />
                        </div>
                    ) : results.length > 0 ? (
                        Object.keys(groupedResults).map((type) => (
                            <div key={type}>
                                <div className={styles.searchSection}>{typeLabels[type] || type}</div>
                                {groupedResults[type].map((item) => (
                                    <Link
                                        key={`${item.type}-${item.id}`}
                                        href={item.url}
                                        className={styles.searchItem}
                                        onClick={handleResultClick}
                                    >
                                        <div className={styles.itemContent}>
                                            <div className={styles.itemTitle}>{item.title}</div>
                                            <div className={styles.itemSubtitle}>{item.subtitle}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ))
                    ) : (
                        <div className={styles.noResults}>
                            No results found for "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
