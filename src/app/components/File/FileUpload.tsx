'use client';

import { useState, useRef, ChangeEvent } from 'react';
import styles from './fileupload.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface FileUploadProps {
  companyId?: string;
  contactId?: string;
  onUploadSuccess: () => void;
  onClose: () => void; // New prop for closing the modal
  isOpen: boolean; // New prop to control modal visibility
}

export default function FileUpload({
  companyId,
  contactId,
  onUploadSuccess,
  onClose,
  isOpen
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as ArrayBuffer;
          const byteArray = Array.from(new Uint8Array(fileContent));

          let url = '';
          let bodyData = {};

          if (companyId) {
            url = '/api/companies/files';
            bodyData = {
              companyId,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size,
              fileContent: byteArray,
              description,
            };
          } else if (contactId) {
            url = '/api/contacts/files';
            bodyData = {
              contactId,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size,
              fileContent: byteArray,
              description,
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

          onUploadSuccess();
          setSelectedFile(null);
          setDescription('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onClose(); // Close the modal after successful upload
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        throw new Error('Failed to read file');
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Upload New File</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-thin fa-xmark"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Select File *</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label>Description (Optional)</label>
              <textarea
                placeholder="File description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && <div className={`${styles.error} ${styles.formGroupFull}`}>{error}</div>}
          </div>

          <div className={styles.formActions}>
            <button
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className={styles.submitButton}
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}