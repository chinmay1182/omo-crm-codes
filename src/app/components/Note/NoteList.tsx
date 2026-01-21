'use client';

import { useState, useEffect } from 'react';
import styles from './notelist.module.css';
import Skeleton from '../ui/Skeleton';

interface CompanyNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NoteListProps {
  companyId?: string;
  contactId?: string;
}

export default function NoteList({ companyId, contactId }: NoteListProps) {
  const [notes, setNotes] = useState<CompanyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        let url = '';

        if (companyId) {
          url = `/api/companies/notes?companyId=${companyId}`;
        } else if (contactId) {
          url = `/api/contacts/notes?contactId=${contactId}`;
        } else {
          throw new Error('Either companyId or contactId is required');
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch notes');
        }

        const data = await response.json();
        setNotes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    if (companyId || contactId) {
      fetchNotes();
    }
  }, [companyId, contactId]);

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      let url = '';
      if (companyId) {
        url = `/api/companies/notes/${noteId}`;
      } else if (contactId) {
        url = `/api/contacts/notes/${noteId}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter(note => note.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  if (loading) {
    return (
      <div className={styles.noteListContainer}>
        <ul className={styles.noteList}>
          {[1, 2, 3].map((i) => (
            <li key={i} className={styles.noteItem}>
              <div className={styles.noteInfo} style={{ width: '100%' }}>
                <Skeleton width={120} height={24} style={{ marginBottom: '8px' }} />
                <Skeleton width="100%" height={16} style={{ marginBottom: '4px' }} />
                <Skeleton width="90%" height={16} style={{ marginBottom: '4px' }} />
                <Skeleton width={150} height={14} style={{ marginTop: '8px' }} />
              </div>
              <div className={styles.noteActions}>
                <Skeleton width={80} height={36} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.noteListContainer}>
      {notes.length === 0 ? (
        <p className={styles.noNotes}>No notes added yet.</p>
      ) : (
        <ul className={styles.noteList}>
          {notes.map((note) => (
            <li key={note.id} className={styles.noteItem}>
              <div className={styles.noteInfo}>
                <h4 className={styles.noteTitle}>{note.title}</h4>
                <p className={styles.noteContent}>{note.content}</p>
                <div className={styles.noteMeta}>
                  <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
                  {note.updated_at !== note.created_at && (
                    <span>Updated: {new Date(note.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className={styles.noteActions}>
                <button
                  onClick={() => handleDelete(note.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}