"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import styles from "./TemplateModal.module.css";

interface Template {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: Array<{
    type: string;
    format?: string;
    text?: string;
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: any) => void;
  recipientNumber: string;
  fromNumber: string;
}

export default function TemplateModal({
  isOpen,
  onClose,
  onSend,
  recipientNumber,
  fromNumber,
}: TemplateModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [parameters, setParameters] = useState<string[]>([]);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchSavedImages();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/whatsapp-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        toast.error("Failed to fetch templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Error fetching templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedImages = async () => {
    try {
      const res = await fetch("/api/media-list");
      if (res.ok) {
        const data = await res.json();
        setSavedImages(data.files || []);
      }
    } catch (error) {
      console.error("Error fetching saved images:", error);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);

    const bodyComponent = template.components?.find((c) => c.type === "BODY");

    // Extract variable parameters
    if (bodyComponent?.text) {
      // Regex to match {{1}}, {{ 2 }}, {{ 10 }} etc.
      const matches = bodyComponent.text.match(/\{\{\s*(\d+)\s*\}\}/g);

      if (matches && matches.length > 0) {
        // Extract numbers and find the maximum index (e.g., from {{1}}, {{3}} -> max is 3)
        // We use max index because WhatsApp variables are usually sequential 1-based indices
        const indices = matches.map(m => {
          const num = m.match(/\d+/);
          return num ? parseInt(num[0], 10) : 0;
        });

        const count = Math.max(0, ...indices);
        setParameters(new Array(count).fill(""));
      } else {
        setParameters([]);
      }
    } else {
      setParameters([]);
    }

    setHeaderImage(null);
  };

  const updateParameter = (index: number, value: string) => {
    const newParams = [...parameters];
    newParams[index] = value;
    setParameters(newParams);
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await fetch("/api/media-upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setHeaderImage(data.url);
        setSavedImages((prev) => [data.url, ...prev]); // push new file in gallery
        toast.success("Image uploaded successfully");
      } else {
        toast.error("Failed to upload image");
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload error");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    // Extract buttons from template
    const buttonsComponent = selectedTemplate.components?.find((c) => c.type === "BUTTONS");
    const buttons = buttonsComponent?.buttons || [];

    const data = {
      to: recipientNumber,
      fromNumber,
      templateName: selectedTemplate.name,
      parameters: parameters.filter((p) => p.trim() !== ""),
      headerImage: headerImage || null,
      templateBody: getTemplatePreview(selectedTemplate),
      buttons: buttons,
    };

    onSend(data);
    onClose();
    setSelectedTemplate(null);
    setParameters([]);
    setHeaderImage(null);
  };

  const getTemplatePreview = (template: Template) => {
    const bodyComponent = template.components?.find((c) => c.type === "BODY");
    if (!bodyComponent?.text) return "No preview available";

    let preview = bodyComponent.text;
    parameters.forEach((param, index) => {
      if (param.trim()) {
        preview = preview.replace(`{{${index + 1}}}`, param);
      }
    });

    return preview;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Send WhatsApp Template</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading templates...</div>
          ) : (
            <>
              {/* Template List */}
              <div className={styles.section}>
                <label>Select Template</label>
                <div className={styles.templateList}>
                  {templates.length === 0 ? (
                    <div className={styles.noTemplates}>
                      <p>No templates found</p>
                      <small>Create templates in MSG91 dashboard first</small>
                    </div>
                  ) : (
                    templates
                      .filter((t) => t.status === "APPROVED")
                      .map((template) => (
                        <div
                          key={template.id}
                          className={`${styles.templateItem} ${selectedTemplate?.id === template.id
                            ? styles.selected
                            : ""
                            }`}
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <div className={styles.templateHeader}>
                            <span className={styles.templateName}>
                              {template.name}
                            </span>
                            <span className={styles.templateCategory}>
                              {template.category}
                            </span>
                          </div>
                          <div className={styles.templatePreview}>
                            {template.components?.find(
                              (c) => c.type === "BODY"
                            )?.text?.substring(0, 100) || "No preview"}
                            {(template.components?.find(
                              (c) => c.type === "BODY"
                            )?.text?.length || 0) > 100 && "..."}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Parameters */}
              {selectedTemplate && parameters.length > 0 && (
                <div className={styles.section}>
                  <label>Template Parameters</label>
                  <div className={styles.parameters}>
                    {parameters.map((param, index) => (
                      <div key={index} className={styles.parameterField}>
                        <label>Parameter {index + 1}</label>
                        <input
                          type="text"
                          value={param}
                          onChange={(e) =>
                            updateParameter(index, e.target.value)
                          }
                          placeholder={`Enter value for {{${index + 1}}}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Header Image Upload + Saved Gallery */}
              {selectedTemplate?.components?.some(
                (c) => c.type === "HEADER" && c.format === "IMAGE"
              ) && (
                  <div className={styles.section}>
                    <label>Header Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />

                    {uploading && <p className={styles.uploadingText}>Uploading...</p>}

                    {/* Preview */}
                    {headerImage && (
                      <div className={styles.previewImage}>
                        <img src={headerImage} alt="Header Preview" />
                      </div>
                    )}

                    {/* Saved images gallery */}
                    <div className={styles.savedGallery}>
                      <p className={styles.galleryLabel}>Or select from saved images</p>
                      {savedImages.length === 0 ? (
                        <p className={styles.noImages}>No saved images found</p>
                      ) : (
                        <div className={styles.galleryGrid}>
                          {savedImages.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Saved"
                              className={`${styles.galleryImage} ${headerImage === img ? styles.selectedImage : ""
                                }`}
                              onClick={() => setHeaderImage(img)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}


              {/* Preview Section */}
              {selectedTemplate && (
                <div className={styles.section}>
                  <label>Preview</label>
                  <div className={styles.preview}>
                    {headerImage && (
                      <img
                        src={headerImage}
                        alt="Header Preview"
                        className={styles.previewImage}
                      />
                    )}
                    <p>{getTemplatePreview(selectedTemplate)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            className={styles.sendBtn}
            disabled={!selectedTemplate || loading}
          >
            Send Template
          </button>
        </div>
      </div>
    </div>
  );
}
