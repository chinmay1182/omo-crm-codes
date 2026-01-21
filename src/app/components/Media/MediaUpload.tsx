'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import styles from './MediaUpload.module.css';

interface MediaUploadProps {
  isOpen: boolean;
  onClose: () => void;
  recipientNumber: string;
  fromNumber: string;
  replyToMessageId?: string; // for reactions
  onSendMedia?: (payload: any) => void; // Optional callback for optimistic updates
  agentId?: number; // Agent ID for permission validation
}

export default function MediaUpload({
  isOpen,
  onClose,
  recipientNumber,
  fromNumber,
  replyToMessageId,
  onSendMedia,
  agentId,
}: MediaUploadProps) {
  const [messageType, setMessageType] = useState<'text' | 'media' | 'reaction' | 'location'>('text');
  const [textMessage, setTextMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState({ latitude: '', longitude: '', name: '' });
  const [reaction, setReaction] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);


    const response = await fetch('/api/upload-media', { method: 'POST', body: formData });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.url;
  };

  const getMediaTypeForAPI = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const sendMessage = async (data: any) => {
    const response = await fetch('/api/send-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send message');
    }
    return await response.json();
  };

  const handleSend = async () => {
    setUploading(true);
    try {
      if (!recipientNumber) {
        toast.error('Recipient number is required');
        return;
      }

      let payload: any = {
        to: recipientNumber,
        fromNumber,
        agentId // Include agentId for permission validation
      };

      if (messageType === 'text') {
        if (!textMessage.trim()) {
          toast.error('Text message cannot be empty');
          return;
        }
        payload.text = textMessage.trim();
        payload.mediaType = 'text';
      } else if (messageType === 'media') {
        if (!selectedFile) {
          toast.error('Please select a file');
          return;
        }
        const mediaUrl = await uploadFile(selectedFile);
        payload.mediaUrl = mediaUrl;
        payload.mediaType = getMediaTypeForAPI(selectedFile.type);
        payload.filename = selectedFile.name;
        // Only add caption if it's not empty
        if (caption.trim()) {
          payload.caption = caption.trim();
        }
        if (replyToMessageId) {
          payload.replyToMessageId = replyToMessageId;
        }
      } else if (messageType === 'reaction') {
        if (!reaction) {
          toast.error('Select an emoji reaction');
          return;
        }
        if (!replyToMessageId) {
          // If no message to react to, send as text message
          // toast.error('replyToMessageId required for reaction');
          // return;
          payload.text = reaction;
          payload.mediaType = 'text';
          // Reset message type to text for validity
          // messageType is 'reaction' locally but payload is text
        } else {
          payload.mediaType = 'reaction';
          payload.reaction = reaction;
          payload.replyToMessageId = replyToMessageId;
        }
      } else if (messageType === 'location') {
        if (!location.latitude || !location.longitude) {
          toast.error('Latitude and Longitude are required');
          return;
        }
        payload.mediaType = 'location';
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
        if (location.name.trim()) {
          payload.locationName = location.name.trim();
        }
      }


      // Use onSendMedia callback for all types if available (for optimistic updates)
      if (onSendMedia && (messageType === 'media' || messageType === 'location' || messageType === 'reaction')) {
        onSendMedia(payload);
        toast.success(messageType === 'reaction' ? 'Reaction sent!' : 'Message sent successfully!');
        resetForm();
        onClose();
      } else {
        // Fallback to direct API call
        await sendMessage(payload);
        toast.success(messageType === 'reaction' ? 'Reaction sent!' : 'Message sent successfully!');
        resetForm();
        onClose();
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) toast.error(err.message);
      else toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTextMessage('');
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setLocation({ latitude: '', longitude: '', name: '' });
    setReaction('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏'];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Send Message</h3>
          <button onClick={onClose} className={styles.closeBtn} disabled={uploading}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.messageTypeSelector}>
            {(['text', 'media', 'reaction', 'location'] as const).map((type) => (
              <button
                key={type}
                className={`${styles.messageTypeBtn} ${messageType === type ? styles.active : ''}`}
                onClick={() => setMessageType(type)}
                disabled={uploading}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {messageType === 'text' && (
            <textarea
              className={styles.inputField}
              placeholder="Type your message..."
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              rows={4}
              disabled={uploading}
            />
          )}

          {messageType === 'media' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className={styles.fileInput}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                disabled={uploading}
              />
              <label htmlFor="" className={styles.uploadLabel} onClick={() => fileInputRef.current?.click()}>
                {selectedFile ? (
                  <div className={styles.selectedFile}>
                    {preview && <img src={preview} className={styles.preview} />}
                    <div className={styles.fileName}>{selectedFile.name}</div>
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <span className={styles.uploadIcon}>📎</span>
                    <p>Click to select media file</p>
                  </div>
                )}
              </label>

              <textarea
                className={styles.inputField}
                placeholder="Add caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                disabled={uploading}
              />
            </>
          )}

          {messageType === 'reaction' && (
            <div style={{ display: 'flex', gap: '8px', fontSize: '24px' }}>
              {reactions.map((emoji) => (
                <span
                  key={emoji}
                  style={{ cursor: 'pointer', opacity: reaction === emoji ? 1 : 0.5 }}
                  onClick={() => setReaction(emoji)}
                >
                  {emoji}
                </span>
              ))}
            </div>
          )}

          {messageType === 'location' && (
            <>
              <input
                type="number"
                step="any"
                className={styles.inputField}
                placeholder="Latitude (e.g. 19.0760)"
                value={location.latitude}
                onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                disabled={uploading}
              />
              <input
                type="number"
                step="any"
                className={styles.inputField}
                placeholder="Longitude (e.g. 72.8777)"
                value={location.longitude}
                onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                disabled={uploading}
              />
              <input
                type="text"
                className={styles.inputField}
                placeholder="Location Name (optional)"
                value={location.name}
                onChange={(e) => setLocation({ ...location, name: e.target.value })}
                disabled={uploading}
              />
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn} disabled={uploading}>
            Cancel
          </button>
          <button onClick={handleSend} className={styles.sendBtn} disabled={uploading}>
            {uploading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}