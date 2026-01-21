
import React, { useEffect, useState } from 'react';
import { useDesigner } from '../_context';
import { FormElements, FormElementInstance } from './FormElements';
import styles from './builder.module.css';

export default function PropertiesFormSidebar() {
    const { selectedElement, setSelectedElement } = useDesigner();

    if (!selectedElement) return (
        <div style={{ padding: '16px', color: '#666', textAlign: 'center' }}>
            Select an element to edit its properties
        </div>
    );

    // Ensure FormElements has the type
    const elementDefinition = FormElements[selectedElement.type];
    if (!elementDefinition) {
        return <div>Unknown element type</div>;
    }

    // const PropertiesForm = elementDefinition.propertiesComponent;

    return (
        <div className={styles.sidebarSection}>
            <div className={styles.propertiesHeader}>
                <span style={{ fontWeight: 400 }}>Edit Properties</span>
                <button
                    className={styles.closePropsBtn}
                    onClick={() => setSelectedElement(null)}
                >
                    <i className="fa-light fa-times"></i>
                </button>
            </div>

            <GenericPropertiesForm elementInstance={selectedElement} />
        </div>
    );
}

function GenericPropertiesForm({ elementInstance }: { elementInstance: FormElementInstance }) {
    const { updateElement } = useDesigner();
    const [attributes, setAttributes] = useState(elementInstance.extraAttributes || {});

    useEffect(() => {
        setAttributes(elementInstance.extraAttributes || {});
    }, [elementInstance]);

    const applyChanges = (key: string, value: any) => {
        const newAttributes = { ...attributes, [key]: value };
        setAttributes(newAttributes);
        updateElement(elementInstance.id, {
            ...elementInstance,
            extraAttributes: newAttributes
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Common: Label */}
            {'label' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Label</label>
                    <input
                        value={attributes.label}
                        onChange={(e) => applyChanges('label', e.target.value)}
                        style={{
                            padding: '6px 0',
                            border: 'none',
                            borderBottom: '1px solid #e0e0e0',
                            borderRadius: 0,
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Common: PlaceHolder */}
            {'placeHolder' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Placeholder</label>
                    <input
                        value={attributes.placeHolder}
                        onChange={(e) => applyChanges('placeHolder', e.target.value)}
                        style={{
                            padding: '6px 0',
                            border: 'none',
                            borderBottom: '1px solid #e0e0e0',
                            borderRadius: 0,
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Common: HelperText */}
            {'helperText' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Helper Text</label>
                    <input
                        value={attributes.helperText}
                        onChange={(e) => applyChanges('helperText', e.target.value)}
                        style={{
                            padding: '6px 0',
                            border: 'none',
                            borderBottom: '1px solid #e0e0e0',
                            borderRadius: 0,
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Common: Required (Checkbox) */}
            {'required' in attributes && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <input
                        type="checkbox"
                        checked={attributes.required}
                        onChange={(e) => applyChanges('required', e.target.checked)}
                        id="required-check"
                    />
                    <label htmlFor="required-check" style={{ fontSize: '14px', fontWeight: 300 }}>Required</label>
                </div>
            )}

            {/* Title */}
            {'title' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Title</label>
                    <input
                        value={attributes.title}
                        onChange={(e) => applyChanges('title', e.target.value)}
                        style={{
                            padding: '6px 0',
                            border: 'none',
                            borderBottom: '1px solid #e0e0e0',
                            borderRadius: 0,
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Paragraph Text */}
            {'text' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Text</label>
                    <textarea
                        value={attributes.text}
                        rows={5}
                        onChange={(e) => applyChanges('text', e.target.value)}
                        style={{
                            padding: '8px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            resize: 'vertical',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Spacer Height */}
            {'height' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Height (px)</label>
                    <input
                        type="number"
                        value={attributes.height}
                        onChange={(e) => applyChanges('height', parseInt(e.target.value))}
                        style={{
                            padding: '6px 0',
                            border: 'none',
                            borderBottom: '1px solid #e0e0e0',
                            borderRadius: 0,
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Rows (TextArea) */}
            {'rows' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Rows</label>
                    <input
                        type="number"
                        value={attributes.rows}
                        onChange={(e) => applyChanges('rows', parseInt(e.target.value))}
                        style={{
                            padding: '6px 0',
                            border: 'none',
                            borderBottom: '1px solid #e0e0e0',
                            borderRadius: 0,
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Options for Select Field */}
            {'options' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Options (comma separated)</label>
                    <textarea
                        value={Array.isArray(attributes.options) ? attributes.options.join(',') : attributes.options}
                        rows={3}
                        onChange={(e) => applyChanges('options', e.target.value.split(','))}
                        style={{
                            padding: '8px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            resize: 'vertical',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        placeholder="Option 1,Option 2,Option 3"
                        onFocus={(e) => e.target.style.borderColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Max Stars (Star Rating) */}
            {'maxStars' in attributes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>Max Stars</label>
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={attributes.maxStars}
                        onChange={(e) => applyChanges('maxStars', parseInt(e.target.value))}
                        style={{
                            padding: '6px 0',
                            border: 'none',
                            borderBottom: '1px solid #e0e0e0',
                            borderRadius: 0,
                            width: '100%',
                            fontSize: '14px',
                            fontFamily: 'Open Sauce One, sans-serif',
                            background: 'transparent',
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderBottomColor = '#11a454'}
                        onBlur={(e) => e.target.style.borderBottomColor = '#e0e0e0'}
                    />
                </div>
            )}

            {/* Bold Label (Checkbox) */}
            {'boldLabel' in attributes && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <input
                        type="checkbox"
                        checked={attributes.boldLabel}
                        onChange={(e) => applyChanges('boldLabel', e.target.checked)}
                        id="bold-label-check"
                    />
                    <label htmlFor="bold-label-check" style={{ fontSize: '14px', fontWeight: 300 }}>Bold Label</label>
                </div>
            )}
        </div>
    );

}
