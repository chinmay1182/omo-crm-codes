import React from 'react';
import styles from './skeleton.module.css';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    className?: string;
    style?: React.CSSProperties;
}

export default function Skeleton({ width, height, className, style }: SkeletonProps) {
    return (
        <div
            className={`${styles.skeleton} ${className || ''}`}
            style={{
                width: width,
                height: height,
                ...style,
            }}
        />
    );
}
