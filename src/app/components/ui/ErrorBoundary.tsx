'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    fontFamily: 'sans-serif',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8f9fa'
                }}>
                    <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>Something went wrong.</h1>
                    <p style={{ color: '#666', marginBottom: '30px', maxWidth: '500px' }}>
                        We apologize for the inconvenience. An unexpected error occurred.
                    </p>
                    <div style={{
                        padding: '15px',
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        maxWidth: '600px',
                        overflow: 'auto',
                        textAlign: 'left',
                        marginBottom: '20px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                    }}>
                        {this.state.error?.toString()}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
