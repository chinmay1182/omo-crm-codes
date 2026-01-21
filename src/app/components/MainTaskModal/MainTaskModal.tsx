'use client';

import { useState, useEffect } from 'react';
import styles from './MainTaskModal.module.css';

interface TaskModalProps {
    companyId: string;
    onSuccess: () => void;
    onClose: () => void;
    isOpen: boolean;
    companies?: Array<{ id: string; name: string }>;
    contacts?: Array<{ id: string; first_name: string; last_name: string; company_id: string | null }>;
    task?: any; // For editing existing tasks
}

export default function MainTaskModal({
    companyId,
    onSuccess,
    onClose,
    isOpen,
    companies = [],
    contacts = [],
    task = null
}: TaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<'pending' | 'in_progress' | 'hold' | 'drop' | 'completed'>('pending');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
    const [recurringUntil, setRecurringUntil] = useState('');
    const [relatedTo, setRelatedTo] = useState<'contact' | 'company' | 'none'>('company');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [markAsCompleted, setMarkAsCompleted] = useState(false);
    const [markAsHighPriority, setMarkAsHighPriority] = useState(false);
    const [totalAmount, setTotalAmount] = useState('');
    const [selectedCompany, setSelectedCompany] = useState(companyId);
    const [selectedContact, setSelectedContact] = useState('');
    const [companySearch, setCompanySearch] = useState('');
    const [contactSearch, setContactSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isChildTask, setIsChildTask] = useState(false); // Track if this is a child task

    useEffect(() => {
        if (isOpen && task) {
            // Check if this is a child task (part of a recurring series)
            setIsChildTask(!!task.parent_task_id);

            // Populate form with existing task data for editing
            // Unpack Tags from Description (Polyfill)
            let desc = task.description || '';
            let amt = task.total_amount ? task.total_amount.toString() : '';

            // 1. Critical Tag
            const critMatch = desc.match(/\[Critical\]/);
            let isCrit = false;
            if (critMatch) {
                isCrit = true;
                desc = desc.replace(critMatch[0], '').trim();
            }

            // 2. Amount Tag
            const amtMatch = desc.match(/\[Amount:\s*(\d+(\.\d+)?)\]/);
            if (amtMatch) {
                amt = amtMatch[1];
                desc = desc.replace(amtMatch[0], '').trim();
            }

            setTitle(task.title || '');
            setDescription(desc);
            setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
            setStatus(task.status || 'pending');
            setIsRecurring(task.is_recurring || false);
            setRecurrencePattern(task.recurrence_pattern || 'weekly');
            setRecurringUntil(task.recurring_until ? task.recurring_until.split('T')[0] : '');
            setPriority(task.priority || 'medium');
            setMarkAsCompleted(task.mark_as_completed || false);
            setMarkAsHighPriority(isCrit);
            setTotalAmount(amt);
            setSelectedCompany(task.company_id || '');
            setSelectedContact(task.assigned_to || '');
            setRelatedTo(task.company_id ? 'company' : task.assigned_to ? 'contact' : 'none');
        } else if (!isOpen) {
            resetForm();
        }
    }, [isOpen, task]);

    // Auto-suggest recurring_until date based on pattern
    useEffect(() => {
        if (isRecurring && dueDate && !recurringUntil) {
            const start = new Date(dueDate);
            let suggestedEnd = new Date(start);

            switch (recurrencePattern) {
                case 'daily':
                    suggestedEnd.setDate(suggestedEnd.getDate() + 7); // 1 week
                    break;
                case 'weekly':
                    suggestedEnd.setDate(suggestedEnd.getDate() + 28); // 4 weeks
                    break;
                case 'monthly':
                    suggestedEnd.setMonth(suggestedEnd.getMonth() + 6); // 6 months
                    break;
                case 'yearly':
                    suggestedEnd.setFullYear(suggestedEnd.getFullYear() + 1); // 1 year
                    break;
            }

            setRecurringUntil(suggestedEnd.toISOString().split('T')[0]);
        }
    }, [isRecurring, recurrencePattern, dueDate, recurringUntil]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        if (relatedTo === 'company' && !selectedCompany) {
            setError('Please select a company');
            return;
        }

        if (relatedTo === 'contact' && !selectedContact) {
            setError('Please select a contact');
            return;
        }

        // Validate recurring task dates
        if (isRecurring && dueDate && recurringUntil) {
            const start = new Date(dueDate);
            const end = new Date(recurringUntil);

            if (end <= start) {
                setError('Recurring "Until When" date must be AFTER the Due Date to generate multiple tasks');
                return;
            }
        }

        setIsSubmitting(true);
        setError('');

        try {
            const url = task ? `/api/companies/tasks/${task.id}` : '/api/companies/tasks';
            const method = task ? 'PUT' : 'POST';

            // Pack Tags into Description (Polyfill for missing DB columns)
            // Ensure base description is clean (defensive)
            let baseDesc = description
                .replace(/\[Amount:\s*(\d+(\.\d+)?)\]/g, '')
                .replace(/\[Critical\]/g, '')
                .trim();

            if (totalAmount) baseDesc += ` [Amount: ${totalAmount}]`;
            if (markAsHighPriority) baseDesc += ` [Critical]`;

            const packedDescription = baseDesc;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    companyId: relatedTo === 'company' ? selectedCompany : null,
                    title,
                    description: packedDescription,
                    due_date: dueDate || null,
                    status,
                    is_recurring: isRecurring,
                    recurrence_pattern: isRecurring ? recurrencePattern : null,
                    recurring_until: isRecurring && recurringUntil ? recurringUntil : null,
                    related_to: relatedTo === 'none' ? null : relatedTo,
                    priority,
                    mark_as_completed: markAsCompleted,
                    mark_as_high_priority: markAsHighPriority,
                    total_amount: null, // Backend ignores this anyway
                    assigned_to: relatedTo === 'contact' ? selectedContact : null
                }),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const result = await response.json();

            // Show success message with count of generated tasks
            if (result.message) {
                alert(result.message);
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setStatus('pending');
        setIsRecurring(false);
        setRecurrencePattern('weekly');
        setRecurringUntil('');
        setRelatedTo('company');
        setPriority('medium');
        setMarkAsCompleted(false);
        setMarkAsHighPriority(false);
        setTotalAmount('');
        setSelectedCompany(companyId);
        setSelectedContact('');
        setCompanySearch('');
        setContactSearch('');
        setError('');
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(companySearch.toLowerCase())
    );

    const filteredContacts = contacts.filter(contact =>
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(contactSearch.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h4>{task ? 'Edit Task' : 'Add New Task'}</h4>
                    <button onClick={onClose} className={styles.closeButton}>
                        <i className="fa-light fa-xmark"></i>
                    </button>
                </div>
                <div className={styles.modalContent}>
                    <div className={styles.taskForm}>
                        <input
                            type="text"
                            placeholder="Task title*"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={styles.titleInput}
                        />

                        <textarea
                            placeholder="Task description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={styles.descriptionInput}
                        />

                        <div className={styles.formRow}>
                            <label>
                                Due Date:
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className={styles.dateInput}
                                />
                            </label>

                            <label>
                                Status:
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className={styles.statusSelect}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="hold">Hold</option>
                                    <option value="drop">Drop</option>
                                </select>
                            </label>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.checkboxContainer}>
                                <input
                                    type="checkbox"
                                    checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                    disabled={isChildTask}
                                />
                                <span className={styles.formLabel}>Recurring Task</span>
                                {isChildTask && (
                                    <small style={{ color: '#ff9800', marginLeft: '8px', fontSize: '12px' }}>
                                        (Part of recurring series - edit parent to change recurrence)
                                    </small>
                                )}
                            </div>
                            {isRecurring && (
                                <select
                                    value={recurrencePattern}
                                    onChange={(e) => setRecurrencePattern(e.target.value as any)}
                                    className={styles.recurrenceSelect}
                                    disabled={isChildTask}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            )}
                        </div>

                        {isRecurring && (
                            <div className={styles.formRow}>
                                <label>
                                    Until When: <small style={{ color: '#666', fontWeight: 'normal' }}>(must be after Due Date)</small>
                                    <input
                                        type="date"
                                        value={recurringUntil}
                                        onChange={(e) => setRecurringUntil(e.target.value)}
                                        className={styles.dateInput}
                                        min={dueDate || undefined}
                                        disabled={isChildTask}
                                    />
                                </label>
                            </div>
                        )}

                        <div className={styles.formRow}>
                            <label>
                                Related To:
                                <select
                                    value={relatedTo}
                                    onChange={(e) => {
                                        setRelatedTo(e.target.value as any);
                                        if (e.target.value !== 'contact') setSelectedContact('');
                                        if (e.target.value !== 'company') setSelectedCompany('');
                                    }}
                                    className={styles.relatedSelect}
                                >
                                    <option value="company">Company</option>
                                    <option value="contact">Contact</option>
                                    <option value="none">Not Applicable</option>
                                </select>
                            </label>

                            <label>
                                Priority:
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as any)}
                                    className={styles.prioritySelect}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </label>
                        </div>

                        {relatedTo === 'company' && (
                            <div className={styles.formGroup}>
                                <span className={styles.formLabel}>Company:</span>
                                <input
                                    type="text"
                                    placeholder="Search company..."
                                    value={companySearch}
                                    onChange={(e) => {
                                        setCompanySearch(e.target.value);
                                        // Auto-select if there's an exact match
                                        const exactMatch = companies.find(c =>
                                            c.name.toLowerCase() === e.target.value.toLowerCase()
                                        );
                                        if (exactMatch) {
                                            setSelectedCompany(exactMatch.id);
                                        }
                                    }}
                                    className={styles.searchInput}
                                />
                                <select
                                    value={selectedCompany}
                                    onChange={(e) => {
                                        setSelectedCompany(e.target.value);
                                        const selectedCompanyName = companies.find(c => c.id === e.target.value)?.name || '';
                                        setCompanySearch(selectedCompanyName);
                                    }}
                                    className={styles.companySelect}
                                    size={Math.min(filteredCompanies.length + 1, 6)}
                                >
                                    <option value="">Select a company...</option>
                                    {filteredCompanies.length > 0 ? (
                                        filteredCompanies.map(company => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>No companies found</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {relatedTo === 'contact' && (
                            <div className={styles.formGroup}>
                                <span className={styles.formLabel}>Contact:</span>
                                <input
                                    type="text"
                                    placeholder="Search contact..."
                                    value={contactSearch}
                                    onChange={(e) => {
                                        setContactSearch(e.target.value);
                                        // Auto-select if there's an exact match
                                        const exactMatch = contacts.find(c =>
                                            `${c.first_name} ${c.last_name}`.toLowerCase() === e.target.value.toLowerCase()
                                        );
                                        if (exactMatch) {
                                            setSelectedContact(exactMatch.id);
                                        }
                                    }}
                                    className={styles.searchInput}
                                />
                                <select
                                    value={selectedContact}
                                    onChange={(e) => {
                                        setSelectedContact(e.target.value);
                                        const selectedContactName = contacts.find(c => c.id === e.target.value);
                                        if (selectedContactName) {
                                            setContactSearch(`${selectedContactName.first_name} ${selectedContactName.last_name}`);
                                        }
                                    }}
                                    className={styles.contactSelect}
                                    size={Math.min(filteredContacts.length + 1, 6)}
                                >
                                    <option value="">Select a contact...</option>
                                    {filteredContacts.length > 0 ? (
                                        filteredContacts.map(contact => (
                                            <option key={contact.id} value={contact.id}>
                                                {contact.first_name} {contact.last_name}
                                                {contact.company_id ? ` (${companies.find(c => c.id === contact.company_id)?.name || ''})` : ''}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>No contacts found</option>
                                    )}
                                </select>
                            </div>
                        )}

                        <div className={styles.formRow}>
                            <div className={styles.checkboxContainer}>
                                <input
                                    type="checkbox"
                                    checked={markAsCompleted}
                                    onChange={(e) => setMarkAsCompleted(e.target.checked)}
                                />
                                <span className={styles.formLabel}>Mark as Completed</span>
                            </div>
                            <div className={styles.checkboxContainer}>
                                <input
                                    type="checkbox"
                                    checked={markAsHighPriority}
                                    onChange={(e) => setMarkAsHighPriority(e.target.checked)}
                                />
                                <span className={styles.formLabel}>Mark as Critical</span>
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <label>
                                Total Amount:
                                <input
                                    type="number"
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(e.target.value)}
                                    className={styles.amountInput}
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </label>
                        </div>

                        {error && <p className={styles.errorText}>{error}</p>}
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.cancelButton}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim()}
                        className={styles.submitButton}
                    >
                        {isSubmitting ? 'Saving...' : 'Save Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}