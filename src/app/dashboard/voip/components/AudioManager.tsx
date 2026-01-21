'use client';

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import styles from '../styles.module.css';

// Types
interface AudioFile {
  id: number;
  name: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  duration?: number;
  created_at: string;
  is_active: boolean;
  url: string;
  size_formatted: string;
}

interface AudioManagerProps {
  token: string;
  cliNumber: string;
}

// Server-side audio file management functions
async function uploadAudioFile(file: File): Promise<AudioFile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/hold-audio/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Upload failed');
  }

  const data = await res.json();
  return data.file;
}

async function fetchAudioFiles(): Promise<AudioFile[]> {
  const res = await fetch('/api/hold-audio/list');
  
  if (!res.ok) {
    throw new Error('Failed to fetch audio files');
  }

  const data = await res.json();
  return data.files;
}

async function deleteAudioFile(fileId: number): Promise<void> {
  const res = await fetch(`/api/hold-audio/delete?id=${fileId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Delete failed');
  }
}

// Upload to external API
async function uploadVoiceFile(token: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('https://cts.myvi.in:8443/Cpaas/api/v1/clicktocall/HoldmusicUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

const AudioManager: React.FC<AudioManagerProps> = ({ token, cliNumber }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAudioManager, setShowAudioManager] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load audio files on component mount
  useEffect(() => {
    loadAudioFiles();
  }, []);

  const loadAudioFiles = async () => {
    try {
      const files = await fetchAudioFiles();
      setAudioFiles(files);
    } catch (error) {
      console.error('Error loading audio files:', error);
      toast.error('Failed to load audio files');
    }
  };

  // Server-side audio file upload
  const uploadAudioToServer = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Select a file first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    toast.loading('Uploading audio file...', { id: 'upload-action' });

    try {
      const uploadedFile = await uploadAudioFile(file);
      setAudioFiles(prev => [uploadedFile, ...prev]);
      setCallStatus(`Audio file uploaded: ${uploadedFile.name}`);
      toast.success('Audio file uploaded successfully', { id: 'upload-action' });
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setCallStatus('Audio upload failed');
      toast.error('Audio upload failed', { id: 'upload-action' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Upload to external API
  const uploadVoiceToAPI = async () => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }
    
    let fileToUpload: File | null = null;
    
    if (selectedAudioFile) {
      // Convert selected server file to File object
      try {
        const response = await fetch(selectedAudioFile.url);
        const blob = await response.blob();
        fileToUpload = new File([blob], selectedAudioFile.original_filename, {
          type: selectedAudioFile.mime_type
        });
      } catch (error) {
        toast.error('Failed to load selected audio file');
        return;
      }
    } else {
      // Use file from input
      fileToUpload = fileInputRef.current?.files?.[0] || null;
    }
    
    if (!fileToUpload) {
      toast.error('Select a file first');
      return;
    }

    setCallStatus('Uploading voice file to API...');
    toast.loading('Uploading voice file...', { id: 'upload-api-action' });

    try {
      const response = await uploadVoiceFile(token, fileToUpload);
      setCallStatus(JSON.stringify(response));
      toast.success('Voice file uploaded to API successfully', { id: 'upload-api-action' });
    } catch (error) {
      console.error('Upload error:', error);
      setCallStatus('Voice upload failed');
      toast.error('Voice upload failed', { id: 'upload-api-action' });
    }
  };

  const deleteAudio = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this audio file?')) {
      return;
    }

    try {
      await deleteAudioFile(fileId);
      setAudioFiles(prev => prev.filter(f => f.id !== fileId));
      
      // Clear selection if deleted file was selected
      if (selectedAudioFile?.id === fileId) {
        setSelectedAudioFile(null);
      }
      
      toast.success('Audio file deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete audio file');
    }
  };

  const playAudio = (audioFile: AudioFile) => {
    const audio = new Audio(audioFile.url);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio file');
    });
  };

  return (
    <div className={styles.panelContainer}>
      {/* Audio File Management Section */}
      <div className={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className={styles.cpaasHeading}>Hold Music Management</h2>
          <button
            className={styles.button}
            onClick={() => setShowAudioManager(!showAudioManager)}
          >
            {showAudioManager ? 'Hide' : 'Show'} Audio Manager
          </button>
        </div>

        <div className={styles.fileInput}>
          <input type="file" ref={fileInputRef} accept="audio/*" />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button 
            className={styles.button} 
            onClick={uploadAudioToServer}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Save to Server'}
          </button>
          <button 
            className={styles.button} 
            onClick={uploadVoiceToAPI}
            disabled={!token}
          >
            Upload to API
          </button>
        </div>

        {showAudioManager && (
          <div style={{ marginTop: '1rem', border: '1px solid #ddd', padding: '1rem', borderRadius: '4px' }}>
            <h3>Saved Audio Files ({audioFiles.length})</h3>
            
            {audioFiles.length === 0 ? (
              <p>No audio files saved yet.</p>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label>Select for API upload:</label>
                  <select 
                    value={selectedAudioFile?.id || ''} 
                    onChange={(e) => {
                      const fileId = parseInt(e.target.value);
                      setSelectedAudioFile(audioFiles.find(f => f.id === fileId) || null);
                    }}
                    style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
                  >
                    <option value="">Select an audio file...</option>
                    {audioFiles.map(file => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.size_formatted})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {audioFiles.map(file => (
                    <div key={file.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '0.5rem', 
                      border: '1px solid #eee', 
                      marginBottom: '0.5rem',
                      borderRadius: '4px',
                      backgroundColor: selectedAudioFile?.id === file.id ? '#f0f8ff' : 'white'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{file.name}</div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          {file.size_formatted} • {file.mime_type}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#999' }}>
                          {new Date(file.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => playAudio(file)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8em' }}
                        >
                          Play
                        </button>
                        <button 
                          onClick={() => setSelectedAudioFile(file)}
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            fontSize: '0.8em',
                            backgroundColor: selectedAudioFile?.id === file.id ? '#007bff' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px'
                          }}
                        >
                          {selectedAudioFile?.id === file.id ? 'Selected' : 'Select'}
                        </button>
                        <button 
                          onClick={() => deleteAudio(file.id)}
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            fontSize: '0.8em',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {callStatus && (
        <div className={styles.statusDisplay}>
          <strong>Audio Status:</strong>
          <pre>{callStatus}</pre>
        </div>
      )}

      <div className={styles.statusDisplay}>
        <strong>Audio Debug Info:</strong>
        <pre>Total Files: {audioFiles.length}</pre>
        <pre>Selected Audio: {selectedAudioFile?.name || 'None'}</pre>
        <pre>Upload Progress: {uploadProgress}%</pre>
        <pre>Is Uploading: {isUploading ? 'Yes' : 'No'}</pre>
      </div>
    </div>
  );
};

export default AudioManager;