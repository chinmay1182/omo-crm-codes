
'use client';

import { Dispatch, SetStateAction, createContext, useState, useContext } from 'react';
import { FormElement, FormElementInstance } from './_components/FormElements';

type DesignerContextType = {
    elements: FormElementInstance[];
    setElements: Dispatch<SetStateAction<FormElementInstance[]>>;
    addProductElement: (index: number, element: FormElementInstance) => void;
    removeElement: (id: string) => void;
    selectedElement: FormElementInstance | null;
    setSelectedElement: Dispatch<SetStateAction<FormElementInstance | null>>;
    updateElement: (id: string, element: FormElementInstance) => void;
};

export const DesignerContext = createContext<DesignerContextType | null>(null);

export default function DesignerContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [elements, setElements] = useState<FormElementInstance[]>([]);
    const [selectedElement, setSelectedElement] = useState<FormElementInstance | null>(null);

    const addProductElement = (index: number, element: FormElementInstance) => {
        setElements((prev) => {
            const newElements = [...prev];
            newElements.splice(index, 0, element);
            return newElements;
        });
    };

    const removeElement = (id: string) => {
        setElements((prev) => prev.filter((element) => element.id !== id));
    };

    const updateElement = (id: string, element: FormElementInstance) => {
        setElements((prev) => {
            const newElements = [...prev];
            const index = newElements.findIndex((el) => el.id === id);
            newElements[index] = element;
            return newElements;
        });
    };

    return (
        <DesignerContext.Provider
            value={{
                elements,
                setElements,
                addProductElement,
                removeElement,
                selectedElement,
                setSelectedElement,
                updateElement,
            }}
        >
            {children}
        </DesignerContext.Provider>
    );
}

export function useDesigner() {
    const context = useContext(DesignerContext);

    if (!context) {
        throw new Error('useDesigner must be used within a DesignerContextProvider');
    }

    return context;
}
