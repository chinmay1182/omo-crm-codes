
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { FormElements, ElementsType } from './FormElements';
import styles from './builder.module.css';
import { useDesigner } from '../_context';
import { nanoid } from 'nanoid';
import toast from 'react-hot-toast';

export default function SidebarBtnElement({
    formElement,
}: {
    formElement: ElementsType;
}) {
    const { label, icon } = FormElements[formElement].designerBtnElement;
    const { addProductElement, elements } = useDesigner();

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `designer-btn-${formElement}`,
        data: {
            type: formElement,
            isDesignerBtnElement: true,
        },
    });

    const draggableClass = isDragging ? `${styles.elementBtn} ${styles.elementBtnDrag}` : styles.elementBtn;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent drag start if possible
        const newElement = FormElements[formElement].construct(nanoid());
        addProductElement(elements.length, newElement);
        toast.success(`${label} added`);
    };

    return (
        <button
            ref={setNodeRef}
            className={draggableClass}
            {...listeners}
            {...attributes}
            onClick={handleClick}
            type="button" // Ensure it doesn't submit forms
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
