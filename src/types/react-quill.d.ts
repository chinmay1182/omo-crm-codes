declare module 'react-quill-new' {
    import React from 'react';

    export interface ReactQuillProps {
        value?: string;
        defaultValue?: string;
        readOnly?: boolean;
        theme?: string;
        onChange?: (content: string, delta: any, source: string, editor: any) => void;
        onChangeSelection?: (range: any, source: string, editor: any) => void;
        placeholder?: string;
        modules?: any;
        formats?: string[];
        style?: React.CSSProperties;
        className?: string;
        tabIndex?: number;
        bounds?: string | HTMLElement;
        scrollingContainer?: string | HTMLElement;
        preserveWhitespace?: boolean;
        children?: React.ReactNode;
    }

    export default class ReactQuill extends React.Component<ReactQuillProps> { }
}
