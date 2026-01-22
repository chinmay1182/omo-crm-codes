'use client';

import React, { useState, useEffect } from 'react';
import styles from './TagSelector.module.css';

import toast from 'react-hot-toast';

interface Tag {
  id: string;
  name: string;
  type: 'contact_tag' | 'company_tag';
}

interface TagSelectorProps {
  entityId: string;
  entityType: 'contact' | 'company';
  currentTags: string[];
  onTagsUpdate: () => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  entityId,
  entityType,
  currentTags,
  onTagsUpdate
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tagType = entityType === 'contact' ? 'contact_tag' : 'company_tag';

  useEffect(() => {
    fetchAvailableTags();
    fetchCurrentTagIds();
  }, [entityId, entityType]);

  const fetchAvailableTags = async () => {
    try {
      const response = await fetch('/api/contact-tags');
      if (response.ok) {
        const allTags = await response.json();
        const filteredTags = allTags.filter((tag: Tag) => tag.type === tagType);
        setAvailableTags(filteredTags);
      }
    } catch (error) {
      console.error('Error fetching available tags:', error);
    }
  };

  const fetchCurrentTagIds = async () => {
    try {
      const endpoint = entityType === 'contact'
        ? `/api/contacts/${entityId}/tags`
        : `/api/companies/${entityId}/tags`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const tags = await response.json();
        setSelectedTagIds(tags.map((tag: Tag) => tag.id));
      }
    } catch (error) {
      console.error('Error fetching current tags:', error);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const endpoint = entityType === 'contact'
        ? `/api/contacts/${entityId}/tags`
        : `/api/companies/${entityId}/tags`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagIds: selectedTagIds }),
      });

      if (response.ok) {
        toast.success(`${entityType === 'contact' ? 'Contact' : 'Company'} tags updated successfully`);
        setIsEditing(false);
        onTagsUpdate();
      } else {
        throw new Error('Failed to update tags');
      }
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchCurrentTagIds(); // Reset to original state
  };

  if (!isEditing) {
    return (
      <div className={styles.tagDisplay}>
        <div className={styles.tagHeader}>
          <span className={styles.tagLabel}>Tags</span>
          <button
            onClick={() => setIsEditing(true)}
            className={styles.editButton}
            style={{
              backgroundColor: 'white',
              color: '#15426d',
            }}
            title="Edit tags"
          >
            Edit Tags
          </button>
        </div>
        <div className={styles.currentTags}>
          {currentTags.length > 0 ? (
            currentTags.map((tag, index) => (
              <span key={index} className={`${styles.tag} ${styles[entityType + 'Tag']}`}>
                {tag}
              </span>
            ))
          ) : (
            <span className={styles.noTags}>No tags assigned</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tagEditor}>
      <div className={styles.tagHeader}>
        <span className={styles.tagLabel}>Edit Tags</span>
      </div>

      <div className={styles.tagOptions}>
        {availableTags.length > 0 ? (
          availableTags.map(tag => (
            <label key={tag.id} className={styles.tagOption}>
              <input
                type="checkbox"
                checked={selectedTagIds.includes(tag.id)}
                onChange={() => handleTagToggle(tag.id)}
                className={styles.tagCheckbox}
              />
              <span className={`${styles.tag} ${styles[entityType + 'Tag']}`}>
                {tag.name}
              </span>
            </label>
          ))
        ) : (
          <p className={styles.noTagsAvailable}>
            No {entityType} tags available. Create some in the Tags settings.
          </p>
        )}
      </div>

      <div className={styles.tagActions}>
        <button
          onClick={handleCancel}
          className={styles.cancelButton}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={styles.saveButton}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Tags'}
        </button>
      </div>
    </div>
  );
};

export default TagSelector;