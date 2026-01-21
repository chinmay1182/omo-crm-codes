
import React from 'react';

export type ElementsType =
    | 'TextField'
    | 'Title'
    | 'SubTitle'
    | 'Paragraph'
    | 'Separator'
    | 'Spacer'
    | 'NumberField'
    | 'TextArea'
    | 'DateField'
    | 'SelectField'
    | 'CheckboxField'
    | 'CheckboxField'
    | 'CheckboxGroupField'
    | 'StarRating';

export type SubmitFunction = (key: string, value: string) => void;

export type FormElement = {
    id: string;
    type: ElementsType;
    extraAttributes?: Record<string, any>;
};

export type FormElementInstance = {
    id: string;
    type: ElementsType;
    extraAttributes?: Record<string, any>;
};

type FormElementType = {
    type: ElementsType;
    construct: (id: string) => FormElementInstance;
    designerBtnElement: {
        icon: React.ElementType | string;
        label: string;
    };
    designerComponent: React.FC<{
        elementInstance: FormElementInstance;
    }>;
    formComponent: React.FC<{
        elementInstance: FormElementInstance;
        submitValue?: SubmitFunction;
        isInvalid?: boolean;
        defaultValue?: string;
    }>;
    propertiesComponent: React.FC<{
        elementInstance: FormElementInstance;
    }>;
};

type FormElementsType = {
    [key in ElementsType]: FormElementType;
};


export const FormElements: FormElementsType = {
    TextField: {
        type: 'TextField',
        construct: (id: string) => ({
            id,
            type: 'TextField',
            extraAttributes: {
                label: 'Text Field',
                helperText: '',
                required: false,
                placeHolder: 'Value here...',
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-input-text',
            label: 'Text Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                    {elementInstance.extraAttributes?.label}
                    {elementInstance.extraAttributes?.required && '*'}
                </label>
                <input
                    readOnly
                    disabled
                    placeholder={elementInstance.extraAttributes?.placeHolder}
                    style={{
                        padding: '6px 0',
                        border: 'none',
                        borderBottom: '1px solid #e0e0e0',
                        borderRadius: 0,
                        width: '100%',
                        background: 'transparent',
                        fontSize: '14px',
                        fontFamily: 'Open Sauce One, sans-serif',
                        color: '#1e293b'
                    }}
                />
                {elementInstance.extraAttributes?.helperText &&
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    <label style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: isInvalid ? 'red' : 'inherit'
                    }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>
                    <input
                        className={isInvalid ? 'border-red-500' : ''}
                        placeholder={elementInstance.extraAttributes?.placeHolder}
                        onChange={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        onBlur={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        defaultValue={defaultValue}
                        style={{
                            padding: '10px',
                            border: isInvalid ? '1px solid red' : '1px solid #dee2e6',
                            borderRadius: '6px',
                            width: '100%',
                            fontSize: '14px'
                        }}
                    />
                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                            {elementInstance.extraAttributes?.helperText}
                        </p>}
                </div>
            );
        },
        propertiesComponent: ({ elementInstance }) => <div className="p-2">Properties for TextField (To be implemented in Properties Panel)</div>, // Placeholder, real implementation in PropertiesFormSidebar
    },

    Title: {
        type: 'Title',
        construct: (id: string) => ({
            id,
            type: 'Title',
            extraAttributes: {
                title: 'Form Title',
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-heading',
            label: 'Title Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '24px', fontWeight: 600 }}>
                    {elementInstance.extraAttributes?.title}
                </label>
            </div>
        ),
        formComponent: ({ elementInstance }) => (
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>{elementInstance.extraAttributes?.title}</h2>
        ),
        propertiesComponent: () => <div>Title Properties</div>,
    },

    SubTitle: {
        type: 'SubTitle',
        construct: (id: string) => ({
            id,
            type: 'SubTitle',
            extraAttributes: {
                title: 'SubTitle field',
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-heading',
            label: 'SubTitle Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '18px', fontWeight: 500 }}>
                    {elementInstance.extraAttributes?.title}
                </label>
            </div>
        ),
        formComponent: ({ elementInstance }) => (
            <h3 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '12px' }}>{elementInstance.extraAttributes?.title}</h3>
        ),
        propertiesComponent: () => <div>SubTitle Properties</div>,
    },

    Paragraph: {
        type: 'Paragraph',
        construct: (id: string) => ({
            id,
            type: 'Paragraph',
            extraAttributes: {
                text: 'Text here',
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-paragraph',
            label: 'Paragraph Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '14px' }}>
                    {elementInstance.extraAttributes?.text}
                </p>
            </div>
        ),
        formComponent: ({ elementInstance }) => (
            <p style={{ marginBottom: '12px', lineHeight: '1.5', fontSize: '15px' }}>{elementInstance.extraAttributes?.text}</p>
        ),
        propertiesComponent: () => <div>Paragraph Properties</div>,
    },

    Separator: {
        type: 'Separator',
        construct: (id: string) => ({
            id,
            type: 'Separator',
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-minus',
            label: 'Separator',
        },
        designerComponent: () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
                <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #dee2e6' }} />
            </div>
        ),
        formComponent: () => (
            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
        ),
        propertiesComponent: () => <div>No properties for Separator</div>,
    },

    Spacer: {
        type: 'Spacer',
        construct: (id: string) => ({
            id,
            type: 'Spacer',
            extraAttributes: {
                height: 20, // px
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-arrows-up-down',
            label: 'Spacer',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: `${elementInstance.extraAttributes?.height}px`, background: '#f0f0f0', color: '#999', fontSize: '12px' }}>
                Spacer: {elementInstance.extraAttributes?.height}px
            </div>
        ),
        formComponent: ({ elementInstance }) => (
            <div style={{ height: `${elementInstance.extraAttributes?.height}px`, width: '100%' }}></div>
        ),
        propertiesComponent: () => <div>Spacer Properties</div>,
    },

    NumberField: {
        type: 'NumberField',
        construct: (id: string) => ({
            id,
            type: 'NumberField',
            extraAttributes: {
                label: 'Number Field',
                helperText: '',
                required: false,
                placeHolder: '0',
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-hashtag',
            label: 'Number Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                    {elementInstance.extraAttributes?.label}
                    {elementInstance.extraAttributes?.required && '*'}
                </label>
                <input
                    readOnly
                    disabled
                    type="number"
                    placeholder={elementInstance.extraAttributes?.placeHolder}
                    style={{
                        padding: '6px 0',
                        border: 'none',
                        borderBottom: '1px solid #e0e0e0',
                        borderRadius: 0,
                        width: '100%',
                        background: 'transparent',
                        fontSize: '14px',
                        fontFamily: 'Open Sauce One, sans-serif',
                        color: '#1e293b'
                    }}
                />
                {elementInstance.extraAttributes?.helperText &&
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    <label style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: isInvalid ? 'red' : 'inherit'
                    }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>
                    <input
                        type="number"
                        className={isInvalid ? 'border-red-500' : ''}
                        placeholder={elementInstance.extraAttributes?.placeHolder}
                        onChange={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        onBlur={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        defaultValue={defaultValue}
                        style={{
                            padding: '10px',
                            border: isInvalid ? '1px solid red' : '1px solid #dee2e6',
                            borderRadius: '6px',
                            width: '100%',
                            fontSize: '14px'
                        }}
                    />
                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                            {elementInstance.extraAttributes?.helperText}
                        </p>}
                </div>
            );
        },
        propertiesComponent: () => <div>Number Properties</div>,
    },

    TextArea: {
        type: 'TextArea',
        construct: (id: string) => ({
            id,
            type: 'TextArea',
            extraAttributes: {
                label: 'Text Area',
                helperText: '',
                required: false,
                placeHolder: 'Value here...',
                rows: 3,
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-align-justify',
            label: 'Text Area',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                    {elementInstance.extraAttributes?.label}
                    {elementInstance.extraAttributes?.required && '*'}
                </label>
                <textarea
                    readOnly
                    disabled
                    rows={elementInstance.extraAttributes?.rows}
                    placeholder={elementInstance.extraAttributes?.placeHolder}
                    style={{
                        padding: '8px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        width: '100%',
                        background: 'transparent',
                        resize: 'vertical',
                        fontSize: '14px',
                        fontFamily: 'Open Sauce One, sans-serif',
                        color: '#1e293b'
                    }}
                />
                {elementInstance.extraAttributes?.helperText &&
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    <label style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: isInvalid ? 'red' : 'inherit'
                    }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>
                    <textarea
                        rows={elementInstance.extraAttributes?.rows || 3}
                        className={isInvalid ? 'border-red-500' : ''}
                        placeholder={elementInstance.extraAttributes?.placeHolder}
                        onChange={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        onBlur={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        defaultValue={defaultValue}
                        style={{
                            padding: '10px',
                            border: isInvalid ? '1px solid red' : '1px solid #dee2e6',
                            borderRadius: '6px',
                            width: '100%',
                            fontSize: '14px'
                        }}
                    />
                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                            {elementInstance.extraAttributes?.helperText}
                        </p>}
                </div>
            );
        },
        propertiesComponent: () => <div>TextArea Properties</div>,
    },

    DateField: {
        type: 'DateField',
        construct: (id: string) => ({
            id,
            type: 'DateField',
            extraAttributes: {
                label: 'Date Field',
                helperText: '',
                required: false,
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-calendar',
            label: 'Date Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                    {elementInstance.extraAttributes?.label}
                    {elementInstance.extraAttributes?.required && '*'}
                </label>
                <div style={{
                    padding: '6px 0',
                    border: 'none',
                    borderBottom: '1px solid #e0e0e0',
                    background: 'transparent',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontFamily: 'Open Sauce One, sans-serif'
                }}>
                    <i className="fa-sharp fa-thin fa-calendar" />
                    <span>Pick a date</span>
                </div>
                {elementInstance.extraAttributes?.helperText &&
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    <label style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: isInvalid ? 'red' : 'inherit'
                    }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>
                    <input
                        type="date"
                        className={isInvalid ? 'border-red-500' : ''}
                        onChange={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        onBlur={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        defaultValue={defaultValue}
                        style={{
                            padding: '10px',
                            border: isInvalid ? '1px solid red' : '1px solid #dee2e6',
                            borderRadius: '6px',
                            width: '100%',
                            fontSize: '14px'
                        }}
                    />
                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                            {elementInstance.extraAttributes?.helperText}
                        </p>}
                </div>
            );
        },
        propertiesComponent: () => <div>Date Properties</div>,
    },

    SelectField: {
        type: 'SelectField',
        construct: (id: string) => ({
            id,
            type: 'SelectField',
            extraAttributes: {
                label: 'Select Field',
                helperText: '',
                required: false,
                placeHolder: 'Value here...',
                options: ["Option 1", "Option 2"],
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-caret-down',
            label: 'Select Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                    {elementInstance.extraAttributes?.label}
                    {elementInstance.extraAttributes?.required && '*'}
                </label>
                <select
                    disabled
                    style={{
                        width: '100%',
                        padding: '6px 0',
                        border: 'none',
                        borderBottom: '1px solid #e0e0e0',
                        borderRadius: 0,
                        background: 'transparent',
                        fontSize: '14px',
                        fontFamily: 'Open Sauce One, sans-serif',
                        color: '#1e293b'
                    }}
                >
                    <option>Option 1</option>
                    <option>Option 2</option>
                </select>
                {elementInstance.extraAttributes?.helperText &&
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    <label style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: isInvalid ? 'red' : 'inherit'
                    }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>
                    <select
                        className={isInvalid ? 'border-red-500' : ''}
                        onChange={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        onBlur={(e) => submitValue?.(elementInstance.id, e.target.value)}
                        defaultValue={defaultValue || ""}
                        style={{
                            padding: '10px',
                            border: isInvalid ? '1px solid red' : '1px solid #dee2e6',
                            borderRadius: '6px',
                            width: '100%',
                            fontSize: '14px'
                        }}
                    >
                        <option value="" disabled>Select an option</option>
                        {elementInstance.extraAttributes?.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                            {elementInstance.extraAttributes?.helperText}
                        </p>}
                </div>
            );
        },
        propertiesComponent: () => <div>Select Properties</div>,
    },

    CheckboxField: {
        type: 'CheckboxField',
        construct: (id: string) => ({
            id,
            type: 'CheckboxField',
            extraAttributes: {
                label: 'Checkbox Field',
                helperText: '',
                required: false,
                boldLabel: false, // New attribute
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-square-check',
            label: 'Checkbox Field',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="checkbox" disabled />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '14px', fontWeight: elementInstance.extraAttributes?.boldLabel ? 700 : 400 }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>
                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
                </div>
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            const [checked, setChecked] = React.useState(defaultValue === 'true');

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                setChecked(e.target.checked);
                submitValue?.(elementInstance.id, e.target.checked ? 'true' : 'false');
            };

            return (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <input
                        type="checkbox"
                        id={elementInstance.id}
                        checked={checked}
                        className={isInvalid ? 'border-red-500' : ''}
                        onChange={handleChange}
                        style={{
                            marginTop: '4px',
                            cursor: 'pointer'
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label htmlFor={elementInstance.id} style={{
                            fontSize: '15px',
                            fontWeight: elementInstance.extraAttributes?.boldLabel ? 700 : 400,
                            color: isInvalid ? 'red' : 'inherit',
                            cursor: 'pointer'
                        }}>
                            {elementInstance.extraAttributes?.label}
                            {elementInstance.extraAttributes?.required && '*'}
                        </label>
                        {elementInstance.extraAttributes?.helperText &&
                            <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                                {elementInstance.extraAttributes?.helperText}
                            </p>}
                    </div>
                </div>
            );
        },
        propertiesComponent: () => <div>Checkbox Properties</div>,
    },

    CheckboxGroupField: {
        type: 'CheckboxGroupField',
        construct: (id: string) => ({
            id,
            type: 'CheckboxGroupField',
            extraAttributes: {
                label: 'Checkbox Group',
                helperText: '',
                required: false,
                boldLabel: false,
                options: ["Option 1", "Option 2"],
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-list-check',
            label: 'Checkbox Group',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: elementInstance.extraAttributes?.boldLabel ? 700 : 400 }}>
                    {elementInstance.extraAttributes?.label}
                    {elementInstance.extraAttributes?.required && '*'}
                </label>
                {(elementInstance.extraAttributes?.options || []).map((opt: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="checkbox" disabled />
                        <span style={{ fontSize: '14px' }}>{opt}</span>
                    </div>
                ))}
                {elementInstance.extraAttributes?.helperText &&
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            // Default value is JSON array string or empty array
            const [selected, setSelected] = React.useState<string[]>(() => {
                try {
                    return JSON.parse(defaultValue || '[]');
                } catch {
                    return [];
                }
            });

            const handleChange = (option: string, checked: boolean) => {
                const newSelected = checked
                    ? [...selected, option]
                    : selected.filter(o => o !== option);

                setSelected(newSelected);
                submitValue?.(elementInstance.id, JSON.stringify(newSelected));
            };

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <label style={{
                        fontSize: '15px',
                        fontWeight: elementInstance.extraAttributes?.boldLabel ? 700 : 400,
                        color: isInvalid ? 'red' : 'inherit'
                    }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>

                    {(elementInstance.extraAttributes?.options || []).map((opt: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                id={`${elementInstance.id}-${i}`}
                                checked={selected.includes(opt)}
                                onChange={(e) => handleChange(opt, e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor={`${elementInstance.id}-${i}`} style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 400 }}>
                                {opt}
                            </label>
                        </div>
                    ))}

                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                            {elementInstance.extraAttributes?.helperText}
                        </p>}
                </div>
            );
        },
        propertiesComponent: () => <div>Checkbox Group Properties</div>,
    },

    StarRating: {
        type: 'StarRating',
        construct: (id: string) => ({
            id,
            type: 'StarRating',
            extraAttributes: {
                label: 'Rating',
                helperText: '',
                required: false,
                maxStars: 5,
            },
        }),
        designerBtnElement: {
            icon: 'fa-sharp fa-thin fa-star',
            label: 'Star Rating',
        },
        designerComponent: ({ elementInstance }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    {elementInstance.extraAttributes?.label}
                    {elementInstance.extraAttributes?.required && '*'}
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[...Array(elementInstance.extraAttributes?.maxStars || 5)].map((_, i) => (
                        <i key={i} className="fa-sharp fa-thin fa-star" style={{ color: '#ccc', fontSize: '20px' }}></i>
                    ))}
                </div>
                {elementInstance.extraAttributes?.helperText &&
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 300 }}>{elementInstance.extraAttributes?.helperText}</p>}
            </div>
        ),
        formComponent: ({ elementInstance, submitValue, isInvalid, defaultValue }) => {
            const [rating, setRating] = React.useState(defaultValue ? parseInt(defaultValue) : 0);
            const [hover, setHover] = React.useState(0);
            const maxStars = elementInstance.extraAttributes?.maxStars || 5;

            const handleClick = (value: number) => {
                setRating(value);
                submitValue?.(elementInstance.id, value.toString());
            };

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    <label style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: isInvalid ? 'red' : 'inherit'
                    }}>
                        {elementInstance.extraAttributes?.label}
                        {elementInstance.extraAttributes?.required && '*'}
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[...Array(maxStars)].map((_, i) => {
                            const value = i + 1;
                            return (
                                <i
                                    key={i}
                                    className={`fa-star ${value <= (hover || rating) ? 'fa-sharp fa-thin' : 'fa-sharp fa-thin'}`}
                                    style={{
                                        color: value <= (hover || rating) ? '#FFD700' : '#ccc',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s'
                                    }}
                                    onClick={() => handleClick(value)}
                                    onMouseEnter={() => setHover(value)}
                                    onMouseLeave={() => setHover(0)}
                                />
                            );
                        })}
                    </div>
                    {elementInstance.extraAttributes?.helperText &&
                        <p style={{ fontSize: '12px', color: isInvalid ? 'red' : '#666', marginTop: '2px' }}>
                            {elementInstance.extraAttributes?.helperText}
                        </p>}
                </div>
            );
        },
        propertiesComponent: () => <div>Star Rating Properties</div>,
    }
};
