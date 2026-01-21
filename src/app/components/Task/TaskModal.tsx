'use client';

import { useState } from 'react';
import styles from './taskmodal.module.css';

interface TaskModalProps {
  companyId?: string;
  contactId?: string;
  onSuccess: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function TaskModal({ companyId, contactId, onSuccess, onClose, isOpen }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [relatedTo, setRelatedTo] = useState<'contact' | 'company'>('company');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [markAs, setMarkAs] = useState<'completed' | 'dropped' | 'hold'>('completed');
  const [totalAmount, setTotalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let url = '';
      let bodyData = {};
      
      if (companyId) {
        url = '/api/companies/tasks';
        bodyData = {
          companyId,
          title,
          description,
          due_date: dueDate || null,
          status,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          related_to: relatedTo,
          priority,
          mark_as: markAs,
          total_amount: totalAmount ? parseFloat(totalAmount) : null
        };
      } else if (contactId) {
        url = '/api/contacts/tasks';
        bodyData = {
          contactId,
          title,
          description,
          due_date: dueDate || null,
          status,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          related_to: relatedTo,
          priority,
          mark_as: markAs,
          total_amount: totalAmount ? parseFloat(totalAmount) : null
        };
      } else {
        throw new Error('Either companyId or contactId is required');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      onSuccess();
      resetForm();
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
    setRelatedTo('company');
    setPriority('medium');
    setMarkAs('completed');
    setTotalAmount('');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h4>Add New Task</h4>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
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
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
            
            <div className={styles.formRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                Recurring Task
              </label>
              
              {isRecurring && (
                <select
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value as any)}
                  className={styles.recurrenceSelect}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
            
            <div className={styles.formRow}>
              <label>
                Related To:
                <select
                  value={relatedTo}
                  onChange={(e) => setRelatedTo(e.target.value as any)}
                  className={styles.relatedSelect}
                >
                  <option value="company">Company</option>
                  <option value="contact">Contact</option>
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
            
            <div className={styles.formRow}>
              <label>
                Mark As:
                <select
                  value={markAs}
                  onChange={(e) => setMarkAs(e.target.value as any)}
                  className={styles.markAsSelect}
                >
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                  <option value="hold">Hold</option>
                </select>
              </label>
              
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
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
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