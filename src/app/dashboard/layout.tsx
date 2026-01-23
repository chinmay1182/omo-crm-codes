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
import styles from './styles.module.css';
import PaymentHistoryModal from './components/PaymentHistoryModal';
import ProfileSettingsModal from './components/ProfileSettingsModal';
import CompanySettingsModal from './components/CompanySettingsModal';
import MeetingsApiSettingsModal from './components/MeetingsApiSettingsModal';
import ThemeSelectorModal from './components/ThemeSelectorModal';
import GlobalSearch from '../components/ui/GlobalSearch/GlobalSearch';
import Reminders from '../components/ui/Reminders/Reminders';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth(); // Destructure user here to avoid "useAuth()" call later

  // ✅ VoIP auth states
  const [token, setToken] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ✅ Sidebar toggle state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // ✅ Profile dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  // ✅ Theme selector state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('Group 3.png');
  // ✅ App Dropdown state
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  // ✅ New Theme state
  const [useNewTheme, setUseNewTheme] = useState(true);


  // ...

  // ✅ Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCompanySettingsModalOpen, setIsCompanySettingsModalOpen] = useState(false);
  const [isMeetingsApiModalOpen, setIsMeetingsApiModalOpen] = useState(false);

  // ✅ Subscription & Payment States
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);

  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // ✅ Notification rotation state
  const [notificationIndex, setNotificationIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationIndex((prev) => (prev + 1) % 2);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

    // Fetch subscription and payment data
    if (user?.id) {
      fetchSubscription();
    }
  }, [user]);

  // Fetch subscription data
  const fetchSubscription = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/subscriptions?userId=${user.id}`);
      const data = await response.json();

      if (data.subscription) {
        setCurrentSubscription(data.subscription);
        setTrialDaysRemaining(data.trialDaysRemaining || 0);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };



  const isAgent = user?.type === 'agent';

  // State for agent data (needed for incoming call routing)
  const [agentData, setAgentData] = useState<{
    id: number;
    username: string;
    full_name?: string;
    phone_number?: string;
  } | undefined>(undefined);

  // ✅ Company Details State
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [isCompanyDetailsMissing, setIsCompanyDetailsMissing] = useState(false);

  useEffect(() => {
    if (user?.id && isAgent) {
      fetch(`/api/agent-company-details?agentId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setCompanyDetails(data);
            // Check if critical details are missing (e.g., company name or phone)
            if (!data.company_name || !data.company_email || !data.company_phone) {
              setIsCompanyDetailsMissing(true);
            } else {
              setIsCompanyDetailsMissing(false);
            }
          } else {
            // No data found or error means details are missing
            setIsCompanyDetailsMissing(true);
          }
        })
        .catch(err => {
          console.error("Error fetching company details", err);
          setIsCompanyDetailsMissing(true);
        });
    }
  }, [user, isAgent]);

  // ✅ Notification rotation state

  useEffect(() => {
    // 3 states now: 0 (Subscription), 1 (ChatGPT), 2 (Company Details Missing - if applicable)
    const interval = setInterval(() => {
      setNotificationIndex((prev) => {
        const nextInfo = prev + 1;
        // If missing details, cycle 0 -> 1 -> 2 -> 0
        if (isCompanyDetailsMissing) {
          return nextInfo % 3;
        }
        // If NOT missing details, cycle 0 -> 1 -> 0
        return nextInfo % 2;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isCompanyDetailsMissing]);
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

      if ((user as any).phone_number) {
        return;
      }

      try {
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
  ];

  if (isAgent) {
    tabs.push({ label: 'User Profile', href: '/dashboard/agent-info', icon: 'fa-sharp fa-thin fa-user', svgIcon: '/icons-products/mem_st_fill_circle.svg' });
  } else {
    tabs.push({ label: 'Manage Agents', href: '/dashboard/agents', icon: 'fa-sharp fa-thin fa-users', svgIcon: '/icons-products/mem_st_fill_circle.svg' });
  }

  tabs.push({ label: 'Documentation', href: 'https://docs.consolegal.com/', icon: 'fa-sharp fa-thin fa-book', svgIcon: '/icons-products/mem_wave-8.svg' } as any);
  tabs.push({ label: 'Subscriptions', href: '/dashboard/subscriptions', icon: 'fa-sharp fa-thin fa-credit-card', svgIcon: '/icons-products/mem_3d_block2.svg' });

  const handleLogout = async () => {
    try {
      const loadingToast = toast.loading('Logging out...');
      await logout();
      toast.dismiss(loadingToast);
      toast.success('Logged out successfully');
      window.history.replaceState(null, '', '/login');
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      window.location.href = '/login';
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
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
            {useNewTheme && (
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
                  <Link href="/dashboard/subscriptions" className={styles.appDropdownItem} onClick={() => setShowAppDropdown(false)}>
                    <Image src="/icons-products/mem_3d_block2.svg" alt="Subscriptions" width={32} height={32} />
                    <span>Subscriptions</span>
                  </Link>
                </div>
              </>
            )}
            {notificationIndex === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', animation: 'fadeIn 0.5s', height: '28px' }}>
                {currentSubscription?.status === 'trial' ? (
                  <>
                    <span style={{ lineHeight: '1' }}>Your trial is remaining for</span>
                    <span className={styles.trialPill}>
                      {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}
                    </span>
                    <Link href="/dashboard/subscriptions">
                      <button className={styles.buyButton}>Buy Subscription</button>
                    </Link>
                  </>
                ) : currentSubscription?.status === 'active' ? (
                  <>
                    <span style={{ lineHeight: '1' }}>Active Plan:</span>
                    <span className={styles.trialPill}>{currentSubscription.plan_name}</span>
                  </>
                ) : (
                  <>
                    <span style={{ lineHeight: '1' }}>Start your free trial today!</span>
                    <Link href="/dashboard/subscriptions">
                      <button className={styles.buyButton}>View Plans</button>
                    </Link>
                  </>
                )}
              </div>
            ) : notificationIndex === 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', animation: 'fadeIn 0.5s', height: '28px' }}>
                <img
                  src="https://img.icons8.com/ios-glyphs/50/chatgpt.png"
                  alt="AI"
                  width={20}
                  height={20}
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span style={{ lineHeight: '1' }}>ChatGPT Integration coming soon</span>
                <span className={styles.trialPill}>Coming Soon</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', animation: 'fadeIn 0.5s', height: '28px' }}>
                <span style={{ lineHeight: '1' }}>Please update your company and profile details</span>
                <button
                  className={styles.buyButton} // Reusing buyButton style for pill look
                  onClick={() => setIsCompanySettingsModalOpen(true)}
                >
                  Update Now
                </button>
              </div>
            )}
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
                        textAlign: 'left'
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
            </aside>

            {isMobile && sidebarOpen && (
              <div
                className={styles.sidebarBackdrop}
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Main Content */}
            <main className={styles.mainContent}>
              <header className={styles.contentHeader}>
                <div className={styles.headerLeft}>
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

                  <div style={{ fontSize: '18px', fontWeight: 300, color: '#333', marginLeft: '8px' }}>
                    {activeTab?.label || 'Dashboard'}
                  </div>
                </div>

                <div className={styles.headerCenter}>
                  <div className={styles.searchBarContainer}>
                    <GlobalSearch />
                  </div>
                </div>

                <div className={styles.headerRight}>


                  <div className={styles.supportInfo}>
                    <div className={styles.supportLabel}>Call Support</div>
                    <div className={styles.supportNumber}>+91 98342 25937</div>
                  </div>

                  <Reminders />
                  <Notifications className={styles.notificationsButton} />

                  {user && (
                    <div className={styles.topBarUserInfo}>
                      <div className={styles.topBarUserName}>{user.full_name || user.username || user.email}</div>
                      <div className={styles.topBarCompanyName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(user as any)?.company_logo &&
                          <Image
                            src={(user as any).company_logo}
                            alt="logo"
                            width={16}
                            height={16}
                            style={{ borderRadius: '4px', objectFit: 'contain' }}
                          />
                        }
                        {companyDetails?.company_name || user.company_name || 'My Company'}
                      </div>
                    </div>
                  )}
                  <span className={styles.trialPill2}>
                    {currentSubscription?.plan_name || 'Free Trial'}
                  </span>

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
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}
                            >
                              <i className="fa-sharp fa-thin fa-times"></i>
                            </button>
                          </div>

                          <div style={{ padding: '20px' }}>
                            <div style={{ fontWeight: '300', color: '#212121', marginBottom: '10px', fontSize: '16px' }}>
                              Quick Settings
                            </div>
                            <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '6px', border: 'none' }}>
                              {isAgent && (
                                <Link href="/dashboard/agent-info" className={styles.profileDropdownItem} onClick={() => setShowProfileDropdown(false)}>
                                  My Profile
                                </Link>
                              )}
                              <button
                                className={styles.profileDropdownItem}
                                onClick={() => {
                                  setShowProfileDropdown(false);
                                  setIsProfileModalOpen(true);
                                }}
                              >
                                Profile Settings
                              </button>
                              <button
                                className={styles.profileDropdownItem}
                                onClick={() => {
                                  setShowProfileDropdown(false);
                                  setIsCompanySettingsModalOpen(true);
                                }}
                              >
                                Company Settings
                              </button>
                            </div>
                          </div>

                          <div className={styles.themeToggleContainer}>
                            <span className={styles.themeToggleLabel}>Switch to Old Theme</span>
                            <label className={styles.themeToggleSwitch}>
                              <input
                                type="checkbox"
                                checked={!useNewTheme}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
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


                          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '16px', fontWeight: '300', color: '#212121', marginBottom: '10px' }}>
                              Payment Settings
                            </div>
                            <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '6px', border: 'none' }}>
                              <button
                                onClick={() => {
                                  setShowPaymentHistory(true);
                                  setShowProfileDropdown(false);
                                }}
                                className={styles.profileDropdownItem}
                              >
                                Payment History
                              </button>
                            </div>
                          </div>

                          <div style={{ padding: '20px' }}>
                            <div style={{ fontSize: '16px', fontWeight: '300', color: '#212121', marginBottom: '10px' }}>
                              Meetings API Settings
                            </div>
                            <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '6px', border: 'none' }}>
                              <button
                                onClick={() => {
                                  setIsMeetingsApiModalOpen(true);
                                  setShowProfileDropdown(false);
                                }}
                                className={styles.profileDropdownItem}
                              >
                                Meetings API Settings
                              </button>
                            </div>
                          </div>

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



              <div className={styles.contentArea}>
                {children}
              </div>
            </main>

            {/* Theme Selector Modal */}
            <ThemeSelectorModal
              isOpen={showThemeModal}
              onClose={() => setShowThemeModal(false)}
              selectedTheme={selectedTheme}
              setSelectedTheme={setSelectedTheme}
            />

            {/* Company Settings Modal */}
            <CompanySettingsModal
              isOpen={isCompanySettingsModalOpen}
              onRequestClose={() => setIsCompanySettingsModalOpen(false)}
              user={user}
            />

            <MeetingsApiSettingsModal
              isOpen={isMeetingsApiModalOpen}
              onRequestClose={() => setIsMeetingsApiModalOpen(false)}
              user={user}
            />

            <ProfileSettingsModal
              isOpen={isProfileModalOpen}
              onRequestClose={() => setIsProfileModalOpen(false)}
              user={user}
            />

            <PaymentHistoryModal
              isOpen={showPaymentHistory}
              onRequestClose={() => setShowPaymentHistory(false)}
              userId={user?.id}
            />
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}