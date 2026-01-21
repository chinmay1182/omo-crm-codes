'use client';

import React, { useState, useEffect } from 'react';
import styles from './InstantReply.module.css';

interface InstantReply {
  id: string;
  title: string;
  message: string;
  category?: string;
}

interface InstantReplyProps {
  onSendReply: (message: string) => void;
  isVisible: boolean;
  onToggle: () => void;
}

const InstantReply: React.FC<InstantReplyProps> = ({ onSendReply, isVisible, onToggle }) => {
  const [replies, setReplies] = useState<InstantReply[]>([]);
  const [newReply, setNewReply] = useState({ title: '', message: '', category: 'General' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReplies();
  }, []);

  const loadReplies = async () => {
    try {
      const response = await fetch('/api/instant-replies');
      if (response.ok) {
        const data = await response.json();
        setReplies(data);
      }
    } catch (error) {
      console.error('Error loading instant replies:', error);
      // Load default replies if API fails
      setReplies(getDefaultReplies());
    }
  };

  const getDefaultReplies = (): InstantReply[] => [
    {
      id: '1',
      title: 'Welcome Message',
      message: 'Hello! Thank you for contacting us. How can I help you today?',
      category: 'Greeting'
    },
    {
      id: '2',
      title: 'Business Hours',
      message: 'Our business hours are Monday to Friday, 9 AM to 6 PM. We will get back to you during business hours.',
      category: 'Information'
    },
    {
      id: '3',
      title: 'Thank You',
      message: 'Thank you for your message. We appreciate your business!',
      category: 'Closing'
    },
    {
      id: '4',
      title: 'Please Wait',
      message: 'Please give me a moment to check that information for you.',
      category: 'General'
    },
    {
      id: '5',
      title: 'Contact Info',
      message: 'You can reach us at support@company.com or call us at +91-XXXX-XXXX-XX',
      category: 'Information'
    }
  ];

  const saveReply = async () => {
    if (!newReply.title.trim() || !newReply.message.trim()) return;

    const reply: InstantReply = {
      id: Date.now().toString(),
      ...newReply
    };

    try {
      const response = await fetch('/api/instant-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reply)
      });

      if (response.ok) {
        setReplies([...replies, reply]);
      } else {
        // Fallback to local storage
        setReplies([...replies, reply]);
        localStorage.setItem('instantReplies', JSON.stringify([...replies, reply]));
      }
    } catch (error) {
      // Fallback to local storage
      setReplies([...replies, reply]);
      localStorage.setItem('instantReplies', JSON.stringify([...replies, reply]));
    }

    setNewReply({ title: '', message: '', category: 'General' });
    setShowAddForm(false);
  };

  const deleteReply = async (id: string) => {
    try {
      await fetch(`/api/instant-replies/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
    
    const updatedReplies = replies.filter(r => r.id !== id);
    setReplies(updatedReplies);
    localStorage.setItem('instantReplies', JSON.stringify(updatedReplies));
  };

  const filteredReplies = replies.filter(reply =>
    reply.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reply.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reply.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(replies.map(r => r.category).filter(Boolean))];

  if (!isVisible) {
    return (
      <button onClick={onToggle} className={styles.toggleButton} title="Instant Replies">
        <i className="fa-light fa-bolt"></i>
      </button>
    );
  }

  return (
    <div className={styles.instantReplyContainer}>
      <div className={styles.header}>
        <h3>
          <i className="fa-light fa-bolt"></i>
          Instant Replies
        </h3>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.addButton}
            title="Add New Reply"
          >
    <i className="fa-light fa-plus" style={{ color: "white" }}></i>

          </button>
          <button onClick={onToggle} className={styles.closeButton}>
<i className="fa-light fa-times" style={{ color: "white" }}></i>
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className={styles.addForm}>
          <input
            type="text"
            placeholder="Reply title..."
            value={newReply.title}
            onChange={(e) => setNewReply({ ...newReply, title: e.target.value })}
            className={styles.input}
          />
          <select
            value={newReply.category}
            onChange={(e) => setNewReply({ ...newReply, category: e.target.value })}
            className={styles.select}
          >
            <option value="General">General</option>
            <option value="Greeting">Greeting</option>
            <option value="Information">Information</option>
            <option value="Closing">Closing</option>
            <option value="Support">Support</option>
          </select>
          <textarea
            placeholder="Reply message..."
            value={newReply.message}
            onChange={(e) => setNewReply({ ...newReply, message: e.target.value })}
            className={styles.textarea}
            rows={3}
          />
          <div className={styles.formActions}>
            <button onClick={saveReply} className={styles.saveButton}>
              Save Reply
            </button>
            <button onClick={() => setShowAddForm(false)} className={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search replies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.repliesList}>
        {categories.map(category => {
          const categoryReplies = filteredReplies.filter(r => r.category === category);
          if (categoryReplies.length === 0) return null;

          return (
            <div key={category} className={styles.category}>
              <h4 className={styles.categoryTitle}>{category}</h4>
              {categoryReplies.map(reply => (
                <div key={reply.id} className={styles.replyItem}>
                  <div className={styles.replyContent}>
                    <div className={styles.replyTitle}>{reply.title}</div>
                    <div className={styles.replyMessage}>{reply.message}</div>
                  </div>
                  <div className={styles.replyActions}>
                    <button
                      onClick={() => onSendReply(reply.message)}
                      className={styles.sendButton}
                      title="Send this reply"
                    >
                      <i className="fa-light fa-paper-plane"></i>
                    </button>
                    <button
                      onClick={() => deleteReply(reply.id)}
                      className={styles.deleteButton}
                      title="Delete reply"
                    >
                      <i className="fa-light fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {filteredReplies.filter(r => !r.category || r.category === 'General').map(reply => (
          <div key={reply.id} className={styles.replyItem}>
            <div className={styles.replyContent}>
              <div className={styles.replyTitle}>{reply.title}</div>
              <div className={styles.replyMessage}>{reply.message}</div>
            </div>
            <div className={styles.replyActions}>
              <button
                onClick={() => onSendReply(reply.message)}
                className={styles.sendButton}
                title="Send this reply"
              >
                <i className="fa-light fa-paper-plane"></i>
              </button>
              <button
                onClick={() => deleteReply(reply.id)}
                className={styles.deleteButton}
                title="Delete reply"
              >
                <i className="fa-light fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InstantReply;