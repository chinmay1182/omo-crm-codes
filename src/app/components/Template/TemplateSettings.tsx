'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import styles from './TemplateSettings.module.css';

interface Template {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: Array<{
    type: string;
    text?: string;
    parameters?: Array<{ type: string; text: string }>;
  }>;
}

interface TemplateSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplateSettings({ isOpen, onClose }: TemplateSettingsProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [templateFilter, setTemplateFilter] = useState('all'); // all, approved, pending, rejected
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en',
    body: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);

        if (data.whatsappNumber) {
          toast.success(`Templates loaded for WhatsApp: +${data.whatsappNumber}`);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch templates:', errorData);
        toast.error(`Failed to fetch templates: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error fetching templates');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.body) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const templateData = {
        name: newTemplate.name.toLowerCase().replace(/\s+/g, '_'),
        category: newTemplate.category,
        language: newTemplate.language,
        components: [
          {
            type: 'BODY',
            text: newTemplate.body
          }
        ]
      };

      const response = await fetch('/api/whatsapp-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        toast.success('Template created successfully! It will be reviewed by WhatsApp.');
        setShowCreateForm(false);
        setNewTemplate({ name: '', category: 'MARKETING', language: 'en', body: '' });
        fetchTemplates();
      } else {
        const error = await response.json();
        toast.error(error.details?.message || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Error creating template');
    }
  };

  const deleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/whatsapp-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Template deleted successfully!');
        fetchTemplates();
      } else {
        const error = await response.json();
        toast.error(error.details?.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error deleting template');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#4caf50';
      case 'PENDING': return '#ff9800';
      case 'REJECTED': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return '✅';
      case 'PENDING': return '⏳';
      case 'REJECTED': return '❌';
      default: return '❓';
    }
  };

  // Filter templates based on selected filter
  const filteredTemplates = templates.filter(template => {
    if (templateFilter === 'all') return true;
    return template.status?.toLowerCase() === templateFilter.toLowerCase();
  });

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h5>
            WhatsApp Template Settings
          </h5>
          <button onClick={onClose} className={styles.closeBtn}>
            <i className="fa-light fa-xmark"></i>
          </button>
        </div>


        <div className={styles.content}>
          <div className={styles.actions}>
            <button onClick={fetchTemplates} className={styles.refreshBtn}>
              <i className="fa-light fa-rotate-right" style={{ marginRight: '6px' }}></i> Refresh
            </button>
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Templates</option>
              <option value="approved">✅ Approved Only</option>
              <option value="pending">⏳ Pending Only</option>
              <option value="rejected">❌ Rejected Only</option>
            </select>
          </div>

          {showCreateForm && (
            <div className={styles.createForm}>
              <h4>Create New Template</h4>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Template Name *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., welcome_message"
                  />
                </div>
                <div className={styles.field}>
                  <label>Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Language</label>
                  <select
                    value={newTemplate.language}
                    onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label>Message Body *</label>
                <textarea
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  placeholder="Hello {{1}}, welcome to our service! Use parameters like {{1}}, {{2}} for dynamic content."
                  rows={4}
                />
                <small>Use {`{{1}}, {{2}}, etc.`} for dynamic parameters</small>
              </div>
              <div className={styles.formActions}>
                <button onClick={() => setShowCreateForm(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={createTemplate} className={styles.submitBtn}>
                  Create Template
                </button>
              </div>
            </div>
          )}

          <div className={styles.templatesList}>
            <h4>Your Templates ({filteredTemplates.length}{templateFilter !== 'all' ? ` of ${templates.length}` : ''})</h4>

            {loading ? (
              <div className={styles.loading}>Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className={styles.noTemplates}>
                <p>{templateFilter === 'all' ? 'No templates found' : `No ${templateFilter} templates found`}</p>
                <small>{templateFilter === 'all' ? 'Create your first template to get started' : 'Try changing the filter or create a new template'}</small>
              </div>
            ) : (
              <div className={styles.templates}>
                {filteredTemplates.map((template) => (
                  <div key={template.id} className={styles.templateCard}>
                    <div className={styles.templateHeader}>
                      <div className={styles.templateInfo}>
                        <span className={styles.templateName}>{template.name}</span>
                        <span className={styles.templateCategory}>{template.category}</span>
                      </div>
                      <div className={styles.templateActions}>
                        <div className={styles.templateStatus}>
                          <span
                            className={styles.statusBadge}
                            style={{ backgroundColor: getStatusColor(template.status) }}
                          >
                            {getStatusIcon(template.status)} {template.status}
                          </span>
                        </div>
                        {template.status !== 'APPROVED' && (
                          <button
                            onClick={() => deleteTemplate(template.id, template.name)}
                            className={styles.deleteBtn}
                            title="Delete Template"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className={styles.templateBody}>
                      {template.components?.find(c => c.type === 'BODY')?.text || 'No content'}
                    </div>
                    <div className={styles.templateMeta}>
                      <small>Language: {template.language}</small>
                      {template.status === 'APPROVED' && (
                        <small style={{ color: '#25d366', marginLeft: '12px' }}>
                          ✅ Ready to use
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}