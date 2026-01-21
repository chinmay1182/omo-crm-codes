'use client';

import { useState } from 'react';
import styles from './InteractiveListModal.module.css';

interface Section {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

interface InteractiveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: any) => void;
  recipientNumber: string;
  fromNumber: string;
}

export default function InteractiveListModal({ 
  isOpen, 
  onClose, 
  onSend, 
  recipientNumber, 
  fromNumber 
}: InteractiveListModalProps) {
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [buttonText, setButtonText] = useState('View Options');
  const [sections, setSections] = useState<Section[]>([
    {
      title: 'Section 1',
      rows: [
        { id: 'option1', title: 'Option 1', description: 'Description for option 1' }
      ]
    }
  ]);

  const addSection = () => {
    setSections([...sections, {
      title: `Section ${sections.length + 1}`,
      rows: [{ id: `option${Date.now()}`, title: 'New Option', description: 'Description' }]
    }]);
  };

  const addRow = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].rows.push({
      id: `option${Date.now()}`,
      title: 'New Option',
      description: 'Description'
    });
    setSections(newSections);
  };

  const updateSection = (index: number, field: string, value: string) => {
    const newSections = [...sections];
    (newSections[index] as any)[field] = value;
    setSections(newSections);
  };

  const updateRow = (sectionIndex: number, rowIndex: number, field: string, value: string) => {
    const newSections = [...sections];
    (newSections[sectionIndex].rows[rowIndex] as any)[field] = value;
    setSections(newSections);
  };

  const handleSend = () => {
    const data = {
      to: recipientNumber,
      fromNumber,
      header,
      body,
      footer,
      buttonText,
      sections
    };
    onSend(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* <div className={styles.header}>
          <h3>📋 Send Interactive List</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div> */}

        <div className={styles.content}>
          <div className={styles.field}>
            <label>Header Text</label>
            <input
              type="text"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="e.g., Choose Your Service"
            />
          </div>

          <div className={styles.field}>
            <label>Body Text</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g., Please select from the options below"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label>Footer Text</label>
            <input
              type="text"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="e.g., Powered by Your Company"
            />
          </div>

          <div className={styles.field}>
            <label>Button Text</label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="e.g., View Options"
            />
          </div>

          <div className={styles.sections}>
            <div className={styles.sectionHeader}>
              <label>List Sections</label>
              <button onClick={addSection} className={styles.addBtn}>+ Add Section</button>
            </div>

            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className={styles.section}>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                  placeholder="Section Title"
                  className={styles.sectionTitle}
                />

                {section.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className={styles.row}>
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => updateRow(sectionIndex, rowIndex, 'title', e.target.value)}
                      placeholder="Option Title"
                    />
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(sectionIndex, rowIndex, 'description', e.target.value)}
                      placeholder="Option Description"
                    />
                  </div>
                ))}

                <button 
                  onClick={() => addRow(sectionIndex)} 
                  className={styles.addRowBtn}
                >
                  + Add Option
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSend} className={styles.sendBtn}>Send List</button>
        </div>
      </div>
    </div>
  );
}