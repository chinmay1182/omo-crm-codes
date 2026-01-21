'use client';

import { useState, useEffect } from 'react';
import styles from './filelist.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faTrash } from '@fortawesome/free-solid-svg-icons';

interface CompanyFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
}

interface FileListProps {
  companyId?: string;
  contactId?: string;
}

export default function FileList({ companyId, contactId }: FileListProps) {
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        let url = '';

        if (companyId) {
          url = `/api/companies/files?companyId=${companyId}`;
        } else if (contactId) {
          url = `/api/contacts/files?contactId=${contactId}`;
        } else {
          throw new Error('Either companyId or contactId is required');
        }

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch files');
        }

        const data = await response.json();
        setFiles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        setLoading(false);
      }
    };

    if (companyId || contactId) {
      fetchFiles();
    }
  }, [companyId, contactId]);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      let apiUrl = '';
      if (companyId) {
        apiUrl = `/api/companies/files/${fileId}`;
      } else if (contactId) {
        apiUrl = `/api/contacts/files/${fileId}`;
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      let url = '';
      if (companyId) {
        url = `/api/companies/files/${fileId}`;
      } else if (contactId) {
        url = `/api/contacts/files/${fileId}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFiles(files.filter(file => file.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  if (loading) return <div className={styles.loading}>Loading files...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.fileListContainer}>
      {files.length === 0 ? (
        <p className={styles.noFiles}>No files uploaded yet.</p>
      ) : (
        <ul className={styles.fileList}>
          {files.map((file) => (
            <li key={file.id} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={styles.fileName}>{file.file_name}</span>
                  {(file as any).source && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor:
                        (file as any).source === 'email' ? '#e3f2fd' :
                          (file as any).source === 'whatsapp' ? '#e8f5e9' :
                            '#f5f5f5',
                      color:
                        (file as any).source === 'email' ? '#1976d2' :
                          (file as any).source === 'whatsapp' ? '#388e3c' :
                            '#666',
                      fontWeight: 600
                    }}>
                      {(file as any).source === 'email' ? '📧 Email' :
                        (file as any).source === 'whatsapp' ? '💬 WhatsApp' :
                          '📁 Upload'}
                    </span>
                  )}
                </div>
                <span className={styles.fileMeta}>
                  {file.file_type} • {(file.file_size / 1024).toFixed(2)} KB •{' '}
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
                {file.description && (
                  <p className={styles.fileDescription}>{file.description}</p>
                )}
              </div>
              <div className={styles.fileActions}>
                <button
                  onClick={() => handleDownload(file.id, file.file_name)}
                  className={styles.downloadButton}
                  title="Download"
                >
                  <FontAwesomeIcon icon={faDownload} />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className={styles.deleteButton}
                  title="Delete"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>

            </li>
          ))}
        </ul>
      )}
    </div>
  );
}