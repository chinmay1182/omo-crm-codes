import styles from './subscriptions.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ 
          height: '3rem', 
          backgroundColor: '#e2e8f0', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          maxWidth: '400px',
          margin: '0 auto 1rem auto'
        }} />
        <div style={{ 
          height: '1.5rem', 
          backgroundColor: '#e2e8f0', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem auto'
        }} />
        <div style={{ 
          height: '3rem', 
          backgroundColor: '#e2e8f0', 
          borderRadius: '12px', 
          width: '200px',
          margin: '0 auto'
        }} />
      </div>

      <div className={styles.plansGrid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.planCard} style={{ opacity: 0.6 }}>
            <div style={{ 
              height: '2rem', 
              backgroundColor: '#e2e8f0', 
              borderRadius: '8px', 
              marginBottom: '1rem' 
            }} />
            <div style={{ 
              height: '4rem', 
              backgroundColor: '#e2e8f0', 
              borderRadius: '8px', 
              marginBottom: '2rem' 
            }} />
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              marginBottom: '2rem'
            }}>
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} style={{ 
                  height: '1rem', 
                  backgroundColor: '#e2e8f0', 
                  borderRadius: '4px' 
                }} />
              ))}
            </div>
            <div style={{ 
              height: '3rem', 
              backgroundColor: '#e2e8f0', 
              borderRadius: '12px' 
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}