import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  className?: string;
}

export default function Spinner({ 
  size = 'medium', 
  color = 'primary', 
  text,
  className = '' 
}: SpinnerProps) {
  return (
    <div className={`${styles.spinnerContainer} ${className}`}>
      <div className={`${styles.spinner} ${styles[size]} ${styles[color]}`}></div>
      {text && <p className={styles.spinnerText}>{text}</p>}
    </div>
  );
}
