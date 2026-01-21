
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { FormElements, ElementsType } from './FormElements';
import styles from './builder.module.css';

export default function SidebarBtnElement({
    formElement,
}: {
    formElement: ElementsType;
}) {
    const { label, icon } = FormElements[formElement].designerBtnElement;
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `designer-btn-${formElement}`,
        data: {
            type: formElement,
            isDesignerBtnElement: true,
        },
    });

    const draggableClass = isDragging ? `${styles.elementBtn} ${styles.elementBtnDrag}` : styles.elementBtn;

    return (
        <button
            ref={setNodeRef}
            className={draggableClass}
            {...listeners}
            {...attributes}
        >
            <i className={icon as string} style={{ fontSize: '20px' }}></i>
            <span>{label}</span>
        </button>
    );
}

export function SidebarBtnElementDragOverlay({
    formElement,
}: {
    formElement: ElementsType;
}) {
    const { label, icon } = FormElements[formElement].designerBtnElement;
    return (
        <div className={styles.elementBtn}>
            <i className={icon as string} style={{ fontSize: '20px' }}></i>
            <span>{label}</span>
        </div>
    );
}
