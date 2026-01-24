'use client';

import { useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage/LandingPage';

export default function Home() {
  const { user, loading } = useAuth();

  // Optionally we could show a loading spinner here, but for a landing page 
  // it is better to show content immediately. 
  // The LandingPage will handle the "Login" vs "Dashboard" button state.

  if (loading) {
    return null; // Or a minimal spinner if desired, but blocking the landing page is not ideal. 
    // Actually, if we return null, we get a white screen. 
    // Better to return LandingPage with user=null initially if loading? 
    // But then it might flicker from "Login" to "Dashboard".
    // Let's return null just for a brief moment to avoid button flicker if they are logged in.
    // Or better yet, render LandingPage but maybe with a 'loading' prop if needed?
    // I'll stick to returning LandingPage. If it flickers, so be it, it's better than blank.
    // Actually, let's just return <LandingPage user={user} />. 
    // If user is null (loading usually implies user is not yet resolved), it shows Login. 
    // If it resolves to logged in, it switches. This is standard SPA behavior.
  }

  return <LandingPage user={user} />;
}