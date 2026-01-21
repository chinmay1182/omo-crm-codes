'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Notifications from '../components/Notifications/Notifications';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import toast from 'react-hot-toast';
import { fetchAuthToken } from '@/app/lib/voipService';
import Modal from 'react-modal';
// import IncomingCallListener from './components/IncomingCallListener';
import styles from './styles.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  // ✅ VoIP auth states
  const [token, setToken] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ✅ Sidebar toggle state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // ✅ Email states
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [hasGoogleTokens, setHasGoogleTokens] = useState(false);
  const [isGmailImapModalOpen, setIsGmailImapModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gmailImapForm, setGmailImapForm] = useState({
    email: '',
    appPassword: '',
  });

  // ✅ Settings popup state
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  // ✅ Profile dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  // ✅ Theme selector state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('Group 1.png');
  // ✅ App Dropdown state
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  // ✅ New Theme state (Controls Sidebar White mode, SVG Icons, Notification Bar)
  const [useNewTheme, setUseNewTheme] = useState(true);

  // ✅ Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Get user type from auth context
  // MOVED UP to fix reference error
  const { user } = useAuth();

  useEffect(() => {
    if (user?.profile_image) {
      setSelectedIcon(user.profile_image);
    }
  }, [user]);


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  useEffect(() => {
    if (isProfileModalOpen) {
      fetch('/api/profile-icons')
        .then(res => res.json())
        .then(data => {
          if (data.icons) setAvailableIcons(data.icons);
        })
        .catch(err => console.error('Error fetching icons:', err));
    }
  }, [isProfileModalOpen]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/profile-icons/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Add new icon to the top of list
        setAvailableIcons(prev => [data.filename, ...prev]);
        // Select it
        setSelectedIcon(`/profile-icons/${data.filename}`);
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  // Save profile image
  const saveProfileImage = async () => {
    if (!selectedIcon) return;

    if (!user || !user.id) {
      toast.error('User not identified');
      return;
    }

    try {
      const res = await fetch('/api/agent-auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: user.id,
          profileImage: selectedIcon
        })
      });

      if (res.ok) {
        toast.success('Profile updated successfully! Refreshing...');
        setIsProfileModalOpen(false);
        // Reload page to reflect changes in session/context from server if needed, 
        // or effectively we wait for session refresh. 
        // Force reload acts as a simple way to refresh session data in this context.
        window.location.reload();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Error updating profile');
    }
  };

  useEffect(() => {
    async function authenticate() {
      setAuthLoading(true);
      setAuthError('');
      try {
        const t = await fetchAuthToken();
        setToken(t);
      } catch (e) {
        setAuthError('Failed to authenticate');
      }
      setAuthLoading(false);
    }
    authenticate();

    // Set modal app element
    Modal.setAppElement('body');

    // Check Gmail connection status
    checkGmailConnection();

    // Load saved theme preference
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
      setSelectedTheme(savedTheme);
    }

    // Load saved New Theme preference
    const savedUseNewTheme = localStorage.getItem('useNewTheme');
    if (savedUseNewTheme !== null) {
      setUseNewTheme(savedUseNewTheme === 'true');
    }
  }, []);

  const checkGmailConnection = async () => {
    try {
      const response = await fetch('/api/gmail/user-info');
      const data = await response.json();

      if (response.ok && data.authenticated) {
        setConnectedEmail(data.email);
        setHasGoogleTokens(true);
      } else {
        // Gmail not connected, but don't retry
        setHasGoogleTokens(false);
        setConnectedEmail(null);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      setHasGoogleTokens(false);
      setConnectedEmail(null);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch('/api/google/auth-url');
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
        setShowSettingsPopup(false); // Close settings popup after clicking
      } else {
        toast.error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.error('Failed to initiate Google authentication');
    }
  };

  const disconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? This will remove access to your emails.')) {
      return;
    }

    try {
      const response = await fetch('/api/gmail/disconnect', {
        method: 'POST'
      });

      if (response.ok) {
        setHasGoogleTokens(false);
        setConnectedEmail(null);
        toast.success('Gmail disconnected successfully');
      } else {
        toast.error('Failed to disconnect Gmail');
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast.error('Error disconnecting Gmail');
    }
  };

  const fetchGmailImapEmails = async () => {
    // Validate inputs
    if (!gmailImapForm.email || !gmailImapForm.appPassword) {
      toast.error('Please enter both email and app password');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(gmailImapForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/gmail/fetch-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gmailImapForm.email,
          appPassword: gmailImapForm.appPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Fetched ${data.count || 0} emails successfully`);
        setIsGmailImapModalOpen(false);
        setShowSettingsPopup(false);
        setConnectedEmail(gmailImapForm.email);
        // Clear form
        setGmailImapForm({ email: '', appPassword: '' });
      } else {
        toast.error(data.error || 'Failed to fetch emails');
      }
    } catch (error) {
      console.error('Gmail IMAP fetch error:', error);
      toast.error('Failed to connect to Gmail');
    } finally {
      setIsLoading(false);
    }
  };

  // Get user type from auth context
  // const { user } = useAuth(); // Already called above
  const isAgent = user?.type === 'agent';

  // State for full agent data (needed for incoming call routing)
  const [agentData, setAgentData] = useState<{
    id: number;
    username: string;
    full_name?: string;
    phone_number?: string;
  } | undefined>(undefined);

  // Set agentData from session when user becomes available
  useEffect(() => {
    if (user) {
      const initialData = {
        id: (user as any).id || 0,
        username: user.username || user.email || '',
        full_name: (user as any).full_name,
        phone_number: (user as any).phone_number
      };
      setAgentData(initialData);
    }
  }, [user]);

  // Fetch full agent data from database to get phone_number if not in session
  useEffect(() => {
    const fetchAgentData = async () => {
      if (!user) return;

      // If we already have phone_number from session, no need to fetch
      if ((user as any).phone_number) {
        return;
      }

      try {
        // Fetch agent data from database to get phone_number
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          const agents = Array.isArray(data) ? data : (data.agents || []);
          const currentAgent = agents.find((a: any) => a.username === user.username || a.email === user.email);

          if (currentAgent) {
            setAgentData({
              id: currentAgent.id,
              username: currentAgent.username || currentAgent.email,
              full_name: currentAgent.full_name,
              phone_number: currentAgent.phone_number
            });

          }
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
        // Fallback to session data even if API fails
      }
    };

    fetchAgentData();
  }, [user]);

  const tabs = [
    { label: 'Dashboard Home', href: '/dashboard/today', icon: 'fa-sharp fa-thin fa-calendar-day', svgIcon: '/icons-products/mem_st_fill_square.svg' },
    { label: 'VoIP Dialer', href: '/dashboard/voip', icon: 'fa-sharp fa-thin fa-phone', svgIcon: '/icons-products/mem_sq_cir.svg' },
    { label: 'WhatsApp Chats', href: '/dashboard/sms', icon: 'fa-sharp fa-thin fa-comment-dots', svgIcon: '/icons-products/mem_semi_cir_cir.svg' },
    { label: 'Client Contacts', href: '/dashboard/contacts', icon: 'fa-sharp fa-thin fa-building', svgIcon: '/icons-products/mem_st_fill_circle.svg' },
    { label: 'Service List', href: '/dashboard/services', icon: 'fa-sharp fa-thin fa-briefcase', svgIcon: '/icons-products/mem_ot_square.svg' },
    { label: 'Quick Notes', href: '/dashboard/notes', icon: 'fa-sharp fa-thin fa-note-sticky', svgIcon: '/icons-products/mem_pyra.svg' },
    { label: 'Task Manager', href: '/dashboard/tasks', icon: 'fa-sharp fa-thin fa-tasks', svgIcon: '/icons-products/mem_blocks.svg' },
    { label: 'Meeting Logs', href: '/dashboard/meetings', icon: 'fa-sharp fa-thin fa-calendar-check', svgIcon: '/icons-products/mem_st_fill_square.svg' },
    { label: 'Email Inbox', href: '/dashboard/emails', icon: 'fa-sharp fa-thin fa-envelope', svgIcon: '/icons-products/mem_st_fill_triangle.svg' },
    { label: 'Support Tickets', href: '/dashboard/tickets', icon: 'fa-sharp fa-thin fa-ticket', svgIcon: '/icons-products/mem_3d_cross.svg' },
    { label: 'Lead Tracker', href: '/dashboard/lead-management', icon: 'fa-sharp fa-thin fa-user-plus', svgIcon: '/icons-products/mem_ot_semi_circle.svg' },
    { label: 'Form Builder', href: '/dashboard/form-builder', icon: 'fa-sharp fa-thin fa-check-to-slot', svgIcon: '/icons-products/mem_blocks.svg' },
    { label: 'Global Calendar', href: '/dashboard/calendar', icon: 'fa-sharp fa-thin fa-calendar-days', svgIcon: '/icons-products/mem_hori_cylinder.svg' },
    { label: 'Appointment Slots', href: '/dashboard/scheduling', icon: 'fa-sharp fa-thin fa-clock', svgIcon: '/icons-products/mem_st_fill_triangle2.svg' },
    // Show different tabs based on user type
    ...(isAgent
      ? [{ label: 'User Profile', href: '/dashboard/agent-info', icon: 'fa-sharp fa-thin fa-user', svgIcon: '/icons-products/mem_st_fill_circle.svg' }]
      : [{ label: 'Manage Agents', href: '/dashboard/agents', icon: 'fa-sharp fa-thin fa-users', svgIcon: '/icons-products/mem_st_fill_circle.svg' }]
    ),
    { label: 'Documentation', href: 'https://docs.consolegal.com/', icon: 'fa-sharp fa-thin fa-book', target: '_blank', svgIcon: '/icons-products/mem_wave-8.svg' },
    {
      label: 'Settings',
      href: '#settings', // Dummy href for key
      icon: 'fa-sharp fa-thin fa-gear',
      svgIcon: '/icons-products/mem_3d_block2.svg',
      onClick: () => setShowSettingsPopup(true)
    },
  ];

  const handleLogout = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Logging out...');

      await logout();

      // Clear the loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Logged out successfully');

      // Clear browser history to prevent back navigation
      window.history.replaceState(null, '', '/login');

      // Additional cleanup
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }

      // Force redirect
      window.location.href = '/login';
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
      console.error('Logout error:', error);
    }
  };

  const activeTab = tabs.find((t) => t.href === pathname);

  return (
    <ProtectedRoute>
      <>
        <div className={styles.rootLayout}>
          {/* Notification Bar */}
          <div
            className={styles.notificationBar}
            style={{
              backgroundImage: `url("/themes/${selectedTheme}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'white'
            }}
          >
            {useNewTheme && ( // Only show dots in new theme
              <button
                className={styles.appDropdownTrigger}
                onClick={() => setShowAppDropdown(!showAppDropdown)}
                title="App Launcher"
              >
                <i className="fa-thin fa-grip-dots" style={{ fontSize: '24px' }}></i>
              </button>
            )}

            {showAppDropdown && useNewTheme && (
              <>
                <div className={styles.appDropdownBackdrop} onClick={() => setShowAppDropdown(false)} />
                <div className={styles.appDropdownMenu}>
                  <Link href="/dashboard/today" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_st_fill_square.svg" alt="Dashboard" width={32} height={32} />
                    <span>Dashboard</span>
                  </Link>
                  <Link href="/dashboard/voip" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_sq_cir.svg" alt="Dialer" width={32} height={32} />
                    <span>Dialer</span>
                  </Link>
                  <Link href="/dashboard/sms" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_semi_cir_cir.svg" alt="Chats" width={32} height={32} />
                    <span>Chats</span>
                  </Link>
                  <Link href="/dashboard/contacts" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_st_fill_circle.svg" alt="Contacts" width={32} height={32} />
                    <span>Contacts</span>
                  </Link>
                  <Link href="/dashboard/services" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_ot_square.svg" alt="Services" width={32} height={32} />
                    <span>Services</span>
                  </Link>
                  <Link href="/dashboard/notes" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_pyra.svg" alt="Notes" width={32} height={32} />
                    <span>Notes</span>
                  </Link>
                  <Link href="/dashboard/tasks" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_blocks.svg" alt="Tasks" width={32} height={32} />
                    <span>Tasks</span>
                  </Link>
                  <Link href="/dashboard/meetings" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_st_fill_square.svg" alt="Meetings" width={32} height={32} />
                    <span>Meetings</span>
                  </Link>
                  <Link href="/dashboard/emails" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_st_fill_triangle.svg" alt="Email" width={32} height={32} />
                    <span>Email</span>
                  </Link>
                  <Link href="/dashboard/tickets" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_3d_cross.svg" alt="Tickets" width={32} height={32} />
                    <span>Tickets</span>
                  </Link>
                  <Link href="/dashboard/lead-management" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_ot_semi_circle.svg" alt="Leads" width={32} height={32} />
                    <span>Leads</span>
                  </Link>
                  <Link href="/dashboard/form-builder" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_blocks.svg" alt="Forms" width={32} height={32} />
                    <span>Forms</span>
                  </Link>
                  <Link href="/dashboard/calendar" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_hori_cylinder.svg" alt="Calendar" width={32} height={32} />
                    <span>Calendar</span>
                  </Link>
                  <Link href="/dashboard/scheduling" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_st_fill_triangle2.svg" alt="Scheduling" width={32} height={32} />
                    <span>Slots</span>
                  </Link>

                  {isAgent ? (
                    <Link href="/dashboard/agent-info" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                      <Image src="/icons-products/mem_st_fill_circle.svg" alt="Profile" width={32} height={32} />
                      <span>Profile</span>
                    </Link>
                  ) : (
                    <Link href="/dashboard/agents" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                      <Image src="/icons-products/mem_st_fill_circle.svg" alt="Agents" width={32} height={32} />
                      <span>Agents</span>
                    </Link>
                  )}

                  <Link href="https://docs.consolegal.com/" target="_blank" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_wave-8.svg" alt="Documentation" width={32} height={32} />
                    <span>Docs</span>
                  </Link>

                  <button className={styles.appDropdownItem} onClick={() => { setShowAppDropdown(false); setShowSettingsPopup(true); }}>
                    <Image src="/icons-products/mem_3d_block2.svg" alt="Settings" width={32} height={32} />
                    <span>Settings</span>
                  </button>
                </div>
              </>
            )}
            <span>Your trial is remaining for</span>
            <span className={styles.trialPill}>3 days</span>
            <button className={styles.buyButton}>Buy Subscription</button>
          </div>
          <div className={styles.dashboardLayout}>
            {/* Sidebar */}
            <aside
              className={`
    ${styles.sidebar}
    ${sidebarCollapsed ? styles.sidebarCollapsed : ''}
    ${useNewTheme ? styles.sidebarLight : ''}

    ${isMobile && sidebarOpen ? styles.mobileSidebarOpen : ''}
  `}
            >


              {/* <div className={styles.sidebarHeader}>
                  {!sidebarCollapsed ? (
                    <Image
                      src="/consolegal.jpeg"
                      alt="Consolegal Logo"
                      width={120}
                      height={120}
                      className={styles.logo}
                      unoptimized
                    />
                  ) : (
                    <Image
                      src="/favicon.ico"
                      alt="Consolegal Favicon"
                      width={32}
                      height={32}
                      className={styles.favicon}
                      unoptimized
                    />
                  )}
                </div> */}

              <nav className={styles.sidebarNav}>
                {tabs.map((tab) => (
                  (tab as any).onClick ? (
                    <button
                      key={tab.label}
                      onClick={() => {
                        (tab as any).onClick();
                        isMobile && setSidebarOpen(false);
                      }}
                      className={styles.sidebarTab}
                      title={sidebarCollapsed ? tab.label : ''}
                      style={{
                        width: 'auto',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left' // Ensure text aligns like links
                      }}
                    >
                      <span style={{ marginRight: sidebarCollapsed ? '0' : '8px', width: '32px', display: 'flex', justifyContent: 'center' }}>
                        {useNewTheme && (tab as any).svgIcon ? (
                          <Image src={(tab as any).svgIcon} alt={tab.label} width={26} height={26} />
                        ) : (
                          <i className={`${tab.icon}`} style={{ fontSize: '18px' }}></i>
                        )}
                      </span>
                      {!sidebarCollapsed && tab.label}
                    </button>
                  ) : (
                    <Link
                      key={tab.label}
                      href={tab.href!}
                      onClick={() => isMobile && setSidebarOpen(false)}

                      className={`${styles.sidebarTab} ${pathname === tab.href ? styles.activeTab : ''}`}
                    >

                      <span style={{ marginRight: sidebarCollapsed ? '0' : '8px', width: '32px', display: 'flex', justifyContent: 'center' }}>
                        {useNewTheme && (tab as any).svgIcon ? (
                          <Image src={(tab as any).svgIcon} alt={tab.label} width={26} height={26} />
                        ) : (
                          <i className={`${tab.icon}`} style={{ fontSize: '18px' }}></i>
                        )}
                      </span>
                      {!sidebarCollapsed && tab.label}
                    </Link>
                  )
                ))}
              </nav>

              <div className={styles.sidebarFooter} style={{ display: 'none' }}>
                {/* Logout moved to header profile dropdown */}
              </div>
            </aside>

            {isMobile && sidebarOpen && (
              <div
                className={styles.sidebarBackdrop}
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Main Content */}
            <main className={styles.mainContent}>
              {/* Notification Bar */}


              <header className={styles.contentHeader}>
                <div className={styles.headerLeft}>
                  {/* Sidebar Toggle Button */}
                  {/* Removed !useNewSidebarIcons condition */}
                  <button
                    onClick={() => {
                      if (isMobile) {
                        setSidebarOpen(true);
                      } else {
                        setSidebarCollapsed(!sidebarCollapsed);
                      }
                    }}
                    className={styles.sidebarToggle}
                  >

                    <i className="fa-sharp fa-thin fa-bars"></i>
                  </button>


                  {/* Active Tab Title */}
                  <div style={{ fontSize: '18px', fontWeight: 300, color: '#333', marginLeft: '8px' }}>
                    {activeTab?.label || 'Dashboard'}
                  </div>

                </div>

                <div className={styles.headerCenter}>
                  <div className={styles.searchBarContainer}>
                    <i className={`fa-sharp fa-thin fa-search ${styles.searchIcon}`}></i>
                    <input
                      type="text"
                      placeholder="Search..."
                      className={styles.searchInput}
                    />
                  </div>
                </div>

                <div className={styles.headerRight}>
                  {/* Email Status (only show when connected) */}
                  {connectedEmail && (
                    <div className={styles.connectedStatus}>
                      <span className={styles.connectedDot}></span>
                      <span>Gmail: {connectedEmail}</span>
                      <button onClick={disconnectGmail} className={styles.disconnectButton}>
                        <i className="fa-sharp fa-thin fa-sign-out-alt" style={{ marginRight: '4px' }}></i>
                        Disconnect
                      </button>
                    </div>
                  )}

                  {/* Support Contact Info */}
                  <div className={styles.supportInfo}>
                    <div className={styles.supportLabel}>Call Support</div>
                    <div className={styles.supportNumber}>+1 (555) 123-4567</div>
                  </div>

                  <Notifications className={styles.notificationsButton} />

                  {/* User Info */}
                  {user && (
                    <div className={styles.topBarUserInfo}>
                      <div className={styles.topBarUserName}>{user.full_name || user.username || user.email}</div>
                      <div className={styles.topBarCompanyName}>{user.company_name || 'Company Name'}</div>
                    </div>
                  )}

                  {/* Settings Button removed from here and moved to sidebar */}

                  {/* Profile Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      className={styles.profileButton}
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      title="Profile"
                      style={{ padding: user?.profile_image ? 0 : '8px', overflow: 'hidden', width: '40px', height: '40px', borderRadius: '50%' }}
                    >
                      {user?.profile_image ? (
                        <Image
                          src={user.profile_image}
                          alt="Profile"
                          width={40}
                          height={40}
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          unoptimized
                        />
                      ) : (
                        <i className="fa-sharp fa-thin fa-user-circle" style={{ fontSize: '28px' }}></i>
                      )}
                    </button>

                    {showProfileDropdown && (
                      <>
                        <div
                          className={styles.profileDropdownBackdrop}
                          onClick={() => setShowProfileDropdown(false)}
                        />
                        <div className={styles.profileDropdown}>
                          <div className={styles.profileDropdownHeader}>
                            <div>
                              <div className={styles.profileName}>
                                {user?.full_name || user?.username || user?.email || 'User'}
                              </div>
                              <div className={styles.profileRole}>
                                {user?.roles && user.roles.length > 0
                                  ? user.roles.map((r: string) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')
                                  : (isAgent ? 'Agent' : 'Admin')}
                              </div>
                            </div>
                            <button
                              onClick={() => setShowProfileDropdown(false)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280' }}
                            >
                              <i className="fa-sharp fa-thin fa-times"></i>
                            </button>
                          </div>

                          {isAgent && (
                            <Link href="/dashboard/agent-info" className={styles.profileDropdownItem} onClick={() => setShowProfileDropdown(false)}>
                              <i className="fa-sharp fa-thin fa-user"></i>
                              My Profile
                            </Link>
                          )}

                          {/* Profile Settings Button */}
                          <button
                            className={styles.profileDropdownItem}
                            onClick={() => {
                              setShowProfileDropdown(false);
                              setIsProfileModalOpen(true);
                            }}
                          >
                            <i className="fa-sharp fa-thin fa-user-pen"></i>
                            Profile Settings
                          </button>

                          <div className={styles.themeToggleContainer}>
                            <span className={styles.themeToggleLabel}>Switch to Old Theme</span>
                            <label className={styles.themeToggleSwitch}>
                              <input
                                type="checkbox"
                                checked={!useNewTheme}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  // Switch label is "Switch to Old Theme"
                                  // If checked, it means Old Theme (useNewTheme = false)
                                  const newValue = !isChecked;
                                  setUseNewTheme(newValue);
                                  localStorage.setItem('useNewTheme', String(newValue));
                                  toast.success(isChecked ? 'Switched to Old Theme' : 'Switched to New Theme');
                                }}
                              />
                              <span className={styles.themeToggleSlider}></span>
                            </label>
                          </div>


                          <div className={styles.themeSelectorContainer}>
                            <div className={styles.themeSelectorTitle}>Select Theme</div>
                            <div className={styles.themeOptions}>
                              {['Group 1.png', 'Group 2.png', 'Group 3.png', 'Group 4.png'].map((theme) => (
                                <div
                                  key={theme}
                                  className={`${styles.themeCircle} ${selectedTheme === theme ? styles.themeCircleActive : ''}`}
                                  style={{ backgroundImage: `url("/themes/${theme}")` }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTheme(theme);
                                    localStorage.setItem('selectedTheme', theme);
                                  }}
                                  title={theme.replace('.png', '')}
                                />
                              ))}
                            </div>
                          </div>

                          <div className={styles.profileDropdownDivider}></div>

                          <button onClick={handleLogout} className={`${styles.profileDropdownItem} ${styles.logoutItem}`}>
                            <i className="fa-sharp fa-thin fa-sign-out-alt"></i>
                            Logout
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </header>

              {/* Settings Popup */}
              {showSettingsPopup && (
                <div className={styles.settingsPopup}>
                  <div className={styles.settingsPopupHeader}>
                    <h3>Email Settings</h3>
                    <button
                      onClick={() => setShowSettingsPopup(false)}
                      className={styles.closePopupButton}
                      aria-label="Close settings"
                    >
                      <i className="fa-sharp fa-thin fa-times"></i>
                    </button>
                  </div>

                  <div className={styles.settingsPopupContent}>
                    {!connectedEmail ? (
                      <div className={styles.emailButtons}>
                        <button onClick={handleGoogleAuth} className={styles.authButton}>
                          <i className="fa-sharp fa-thin fa-envelope" style={{ marginRight: '8px' }}></i>
                          Connect Gmail (OAuth)
                        </button>
                        <button onClick={() => setIsGmailImapModalOpen(true)} className={styles.authButton}>
                          <i className="fa-brands fa-google" style={{ marginRight: '8px' }}></i>
                          Gmail IMAP Setup
                        </button>
                      </div>
                    ) : (
                      <div className={styles.connectedStatusPopup}>
                        <p>Gmail connected as: {connectedEmail}</p>
                        <button onClick={disconnectGmail} className={styles.disconnectButton}>
                          <i className="fa-sharp fa-thin fa-sign-out-alt" style={{ marginRight: '4px' }}></i>
                          Disconnect Gmail
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.contentArea}>
                {children}
              </div>
            </main>

            {/* Gmail IMAP Login Modal */}
            <Modal
              isOpen={isGmailImapModalOpen}
              onRequestClose={() => setIsGmailImapModalOpen(false)}
              className={styles.modal}
              overlayClassName={styles.overlay}
            >
              <h2>Connect Gmail via IMAP</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                Enter your Gmail email and App Password to fetch emails via IMAP
              </p>
              <div className={styles.modalContent}>
                <div className={styles.inputGroup}>
                  <label>Gmail Email Address *</label>
                  <input
                    type="email"
                    value={gmailImapForm.email}
                    onChange={e => setGmailImapForm({ ...gmailImapForm, email: e.target.value })}
                    placeholder="your-email@gmail.com"
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Your Gmail email address
                  </small>
                </div>
                <div className={styles.inputGroup}>
                  <label>Gmail App Password *</label>
                  <input
                    type="password"
                    value={gmailImapForm.appPassword}
                    onChange={e => setGmailImapForm({ ...gmailImapForm, appPassword: e.target.value })}
                    placeholder="16-character app password"
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Generate from: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#15426d' }}>Google App Passwords</a>
                  </small>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setIsGmailImapModalOpen(false)} className={styles.secondaryButton}>
                  Cancel
                </button>
                <button onClick={fetchGmailImapEmails} disabled={isLoading} className={styles.primaryButton}>
                  {isLoading ? 'Connecting...' : 'Connect & Fetch Emails'}
                </button>
              </div>
            </Modal>

            {/* Theme Selector Modal */}
            {showThemeModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000,
                  backdropFilter: 'blur(2px)'
                }}
                onClick={() => setShowThemeModal(false)}
              >
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    maxWidth: '800px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 300, fontFamily: 'Open Sauce One' }}>Select Theme</h2>
                    <button
                      onClick={() => setShowThemeModal(false)}
                      style={{
                        background: '#f5f5f5',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        color: '#666'
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '24px',
                    justifyContent: 'center'
                  }}>
                    {['Group 1.png', 'Group 2.png', 'Group 3.png', 'Group 4.png'].map((theme) => (
                      <div
                        key={theme}
                        onClick={() => setSelectedTheme(theme)}
                        style={{
                          cursor: 'pointer',
                          width: '80px',
                          height: '80px',
                          border: selectedTheme === theme ? '3px solid #11a454' : '2px solid #e0e0e0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          position: 'relative',
                          backgroundImage: `url(/themes/${theme})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {selectedTheme === theme && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'rgba(17, 164, 84, 0.9)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold'
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      onClick={() => setShowThemeModal(false)}
                      style={{
                        backgroundColor: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        fontFamily: 'Open Sauce One',
                        fontSize: '14px',
                        fontWeight: 300
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Save theme preference
                        localStorage.setItem('selectedTheme', selectedTheme);
                        setShowThemeModal(false);
                        // Show success message
                        alert('Theme applied successfully!');
                      }}
                      style={{
                        backgroundColor: '#11a454',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        fontFamily: 'Open Sauce One',
                        fontSize: '14px',
                        fontWeight: 300
                      }}
                    >
                      Apply Theme
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Selection Modal */}
            <Modal
              isOpen={isProfileModalOpen}
              onRequestClose={() => setIsProfileModalOpen(false)}
              className={styles.modal}
              overlayClassName={styles.overlay}
              style={{
                overlay: {
                  zIndex: 99999
                }
              }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Choose Profile Picture</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  <i className="fa-light fa-xmark"></i>
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.uploadSection}>
                  <p className={styles.uploadLabel}>Upload New Image</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className={styles.fileInput}
                  />
                  {isUploading && <span className={styles.uploadingText}>Uploading...</span>}
                </div>

                <h4 className={styles.sectionTitle}>Select from library:</h4>

                <div className={styles.iconGrid}>
                  {availableIcons.length > 0 ? availableIcons.map((icon) => {
                    const iconPath = `/profile-icons/${icon}`;
                    const isSelected = selectedIcon === iconPath;
                    return (
                      <div
                        key={icon}
                        className={`${styles.iconOption} ${isSelected ? styles.selected : ''}`}
                        onClick={() => setSelectedIcon(iconPath)}
                      >
                        <Image
                          src={iconPath}
                          alt={icon}
                          width={70}
                          height={70}
                          className={styles.iconImage}
                          unoptimized
                        />
                      </div>
                    );
                  }) : (
                    <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '20px' }}>No icons found in folder</p>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={saveProfileImage}
                >
                  Save Changes
                </button>
              </div>
            </Modal>
          </div>
        </div>

        {/* Global Incoming Call Listener - Rendered outside dashboardLayout to avoid overflow clipping */}
        {/* <IncomingCallListener agentData={agentData} /> */}
      </>
    </ProtectedRoute>
  );
}