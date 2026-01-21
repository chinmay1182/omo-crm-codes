
import React, { useState } from 'react';
import { Active, DragOverlay, useDndMonitor } from '@dnd-kit/core';
import { ElementsType, FormElements } from './FormElements';
import { SidebarBtnElementDragOverlay } from './SidebarBtnElement';
import styles from './builder.module.css';

export default function DragOverlayWrapper() {
    const [draggedItem, setDraggedItem] = useState<Active | null>(null);

    useDndMonitor({
        onDragStart: (event) => {
            setDraggedItem(event.active);
        },
        onDragCancel: () => {
            setDraggedItem(null);
        },
        onDragEnd: () => {
            setDraggedItem(null);
        },
    });

    if (!draggedItem) return null;

    let node = <div>No drag overlay</div>;
    const isSidebarBtnElement = draggedItem.data?.current?.isDesignerBtnElement;

    if (isSidebarBtnElement) {
        const type = draggedItem.data?.current?.type as ElementsType;
        node = <SidebarBtnElementDragOverlay formElement={type} />;
    }

    // Handle dragging existing elements logic here if we implement reordering (sortable)
    // For now, let's assume we mainly drag from sidebar. 
    // If we implement sortable reordering, we need to replicate the DesignerElementWrapper here.

    return <DragOverlay>{node}</DragOverlay>;
}
