import styles from '../styles.module.css';
import Image from 'next/image';

export default function Page() {
  return (
    <div className={styles.comingSoonContainer}>
      <Image
        src="/illustration (4).png"
        alt="WhatsApp Chats Coming Soon"
        width={400}
        height={400}
        style={{ marginBottom: '20px', height: 'auto' }}
        priority
        unoptimized
      />
      <h2 style={{ fontSize: '20px', fontWeight: 300, marginBottom: '10px' }}>WhatsApp Chats Coming Soon</h2>
      <p style={{ maxWidth: '400px', lineHeight: '1.5', fontSize: '16px', fontWeight: 300 }}>
        We are currently working on integrating advanced WhatsApp features. Stay tuned for updates!
      </p>
    </div>
  );
}