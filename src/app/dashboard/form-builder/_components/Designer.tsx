
import React, { useState } from 'react';
import { useDndMonitor, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { nanoid } from 'nanoid';
import styles from './builder.module.css';
import { FormElements, ElementsType, FormElementInstance } from './FormElements';
import { useDesigner } from '../_context';
import SidebarBtnElement from './SidebarBtnElement';
import PropertiesFormSidebar from './PropertiesFormSidebar';
import DragOverlayWrapper from './DragOverlayWrapper';

export default function Designer() {
    const { elements, addProductElement, selectedElement, setSelectedElement, removeElement } = useDesigner();

    const droppable = useDroppable({
        id: 'designer-drop-area',
        data: {
            isDesignerDropArea: true,
        },
    });

    useDndMonitor({
        onDragEnd: (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over) return;

            const isDesignerBtnElement = active.data?.current?.isDesignerBtnElement;

            // Drop on Designer Area
            if (isDesignerBtnElement && over.id === 'designer-drop-area') {
                const type = active.data?.current?.type;
                const newElement = FormElements[type as ElementsType].construct(nanoid());

                addProductElement(elements.length, newElement);
            }
        },
    });

    return (
        <div className={styles.builderContainer}>
            <div className={styles.nav}>
                <div style={{ fontWeight: 'bold', color: '#15426d' }}>Form Editor</div>
            </div>

            <div className={styles.designerWrapper}>
                <div className={styles.designer}>
                    <div
                        ref={droppable.setNodeRef}
                        className={styles.designerDropArea}
                        onClick={() => {
                            if (selectedElement) setSelectedElement(null);
                        }}
                    >
                        {!droppable.isOver && elements.length === 0 && (
                            <div className="flex flex-col items-center justify-center flex-grow font-bold text-3xl text-muted-foreground"
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                                <p style={{ fontSize: '18px', fontWeight: 600 }}>Drop here</p>
                            </div>
                        )}

                        {elements.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '16px', gap: '16px' }}>
                                {elements.map((element) => (
                                    <DesignerElementWrapper key={element.id} element={element} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <aside className={styles.sidebar}>
                    {selectedElement ? (
                        <PropertiesFormSidebar />
                    ) : (
                        <div className={styles.sidebarSection}>
                            <div className={styles.sidebarTitle}>Form Elements</div>
                            <div className={styles.sidebarElementsGrid}>
                                <SidebarBtnElement formElement="TextField" />
                                <SidebarBtnElement formElement="NumberField" />
                                <SidebarBtnElement formElement="TextArea" />
                                <SidebarBtnElement formElement="DateField" />
                                <SidebarBtnElement formElement="SelectField" />
                                <SidebarBtnElement formElement="CheckboxField" />
                                <SidebarBtnElement formElement="CheckboxGroupField" />
                                <SidebarBtnElement formElement="StarRating" />
                                <SidebarBtnElement formElement="Title" />
                                <SidebarBtnElement formElement="SubTitle" />
                                <SidebarBtnElement formElement="Paragraph" />
                                <SidebarBtnElement formElement="Separator" />
                                <SidebarBtnElement formElement="Spacer" />
                            </div>
                        </div>
                    )}
                </aside>
            </div>
            <DragOverlayWrapper />
        </div>
    );
}

function DesignerElementWrapper({ element }: { element: FormElementInstance }) {
    const { removeElement, selectedElement, setSelectedElement } = useDesigner();
    const [mouseIsOver, setMouseIsOver] = useState(false);

    const DesignerElement = FormElements[element.type].designerComponent;

    const isSelected = selectedElement?.id === element.id;

    return (
        <div
            className={`${styles.designerElementWrapper} ${isSelected ? styles.designerElementWrapperSelected : ''}`}
            onMouseEnter={() => setMouseIsOver(true)}
            onMouseLeave={() => setMouseIsOver(false)}
            onClick={(e) => {
                e.stopPropagation(); // Stop bubble so we don't deselect immediately
                setSelectedElement(element);
            }}
        >
            {/* Overlay Actions for Delete */}
            {mouseIsOver && (
                <div style={{ position: 'absolute', right: '10px', top: '10px', zIndex: 10, display: 'flex' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            removeElement(element.id);
                        }}
                        style={{
                            background: 'rgba(100, 116, 139, 0.1)',
                            color: '#64748b',
                            border: 'none',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            fontSize: '12px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(100, 116, 139, 0.2)';
                            e.currentTarget.style.color = '#1e293b';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(100, 116, 139, 0.1)';
                            e.currentTarget.style.color = '#64748b';
                        }}
                    >
                        <i className="fa-light fa-trash"></i>
                    </button>
                </div>
            )}

            {/* Mask to prevent interaction with form inputs inside designer */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }}></div>

            <DesignerElement elementInstance={element} />
        </div>
    );
}
