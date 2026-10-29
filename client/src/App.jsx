import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import AdminPanel from './components/AdminPanel';
import SuperadminPanel from './components/SuperadminPanel';
import PharmaPortalPreview from './components/PharmaPortalPreview';
import PharmaAtmosphere from './components/PharmaAtmosphere';
import PharmaThemeDrawer from './components/PharmaThemeDrawer';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

// Global fetch interceptor for immediate 401 & session termination handling
if (typeof window !== 'undefined' && !window._whd_fetch_intercepted) {
  window._whd_fetch_intercepted = true;
  const rawFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await rawFetch(...args);
    if (response.status === 401) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      // Do not trigger session destruction on standard login credential failures
      if (!url.includes('/api/auth/login')) {
        try {
          const clone = response.clone();
          clone.json().then((data) => {
            let role = null;
            if (url.includes('/api/superadmin/')) role = 'superadmin';
            else if (url.includes('/api/admin/')) role = 'admin';
            else if (url.includes('/api/user/')) role = 'user';

            window.dispatchEvent(
              new CustomEvent('whd_session_terminated', {
                detail: {
                  role,
                  message: data?.message || 'Session expired or account has been deleted.',
                  isDeleted: !!data?.isDeleted
                }
              })
            );
          }).catch(() => {});
        } catch (e) {}
      }
    }
    return response;
  };
}

export default function App() {
  const location = useLocation();

  // If URL is changed manually (via address bar, browser back/forward, hash or route),
  // refresh the page and erase all user entered data
  const isFirstMount = useRef(true);
  const currentUrlRef = useRef(window.location.href);

  useEffect(() => {
    // Clear any previous form or step session data
    try {
      sessionStorage.removeItem('whd_current_step');
      sessionStorage.removeItem('whd_active_doctor');
      sessionStorage.removeItem('whd_selected_habit_ids');
    } catch (e) {}

    const handleManualUrlChange = () => {
      try {
        sessionStorage.clear();
      } catch (e) {}
      window.location.reload();
    };

    window.addEventListener('popstate', handleManualUrlChange);
    window.addEventListener('hashchange', handleManualUrlChange);

    return () => {
      window.removeEventListener('popstate', handleManualUrlChange);
      window.removeEventListener('hashchange', handleManualUrlChange);
    };
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (window.location.href !== currentUrlRef.current) {
      currentUrlRef.current = window.location.href;
      try {
        sessionStorage.clear();
      } catch (e) {}
      window.location.reload();
    }
  }, [location.pathname, location.search, location.hash]);

  // User portal active view: 'onboarding' | 'doctors'
  const [userPortalView, setUserPortalView] = useState('onboarding');

  // Multi-session storage (User, Admin, Superadmin can each maintain their session)
  const [userAuth, setUserAuth] = useState(() => {
    const saved = localStorage.getItem('whd_user_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminAuth, setAdminAuth] = useState(() => {
    const saved = localStorage.getItem('whd_admin_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [superadminAuth, setSuperadminAuth] = useState(() => {
    const saved = localStorage.getItem('whd_superadmin_auth');
    return saved ? JSON.parse(saved) : null;
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    setToasts((prev) => {
      if (prev.some((t) => t.message === message)) {
        return prev;
      }
      const id = Date.now() + Math.random();
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 4000);
      return [...prev, { id, message, type }];
    });
  };

  const handleLoginSuccess = (role, token, user) => {
    const authData = { token, user };
    if (role === 'user') {
      setUserAuth(authData);
      localStorage.setItem('whd_user_auth', JSON.stringify(authData));
    } else if (role === 'admin') {
      setAdminAuth(authData);
      localStorage.setItem('whd_admin_auth', JSON.stringify(authData));
    } else if (role === 'superadmin') {
      setSuperadminAuth(authData);
      localStorage.setItem('whd_superadmin_auth', JSON.stringify(authData));
    }
  };

  // Immediate session destruction when account is deleted or revoked
  const handleSessionDestroyed = useCallback((role, reason) => {
    const defaultMsg = 'Your session has been terminated because this account was deleted.';
    const msg = reason || defaultMsg;

    if (role === 'user' || (!role && userAuth)) {
      setUserAuth(null);
      localStorage.removeItem('whd_user_auth');
      setUserPortalView('onboarding');
    }
    if (role === 'admin' || (!role && adminAuth)) {
      setAdminAuth(null);
      localStorage.removeItem('whd_admin_auth');
    }
    if (role === 'superadmin' || (!role && superadminAuth)) {
      setSuperadminAuth(null);
      localStorage.removeItem('whd_superadmin_auth');
    }

    try {
      sessionStorage.clear();
    } catch {}

    showToast(msg, 'error');
  }, [userAuth, adminAuth, superadminAuth]);

  // Listen for 401 events dispatched by global fetch interceptor
  useEffect(() => {
    const onSessionTerminated = (e) => {
      const { role, message } = e.detail || {};
      handleSessionDestroyed(role, message);
    };

    window.addEventListener('whd_session_terminated', onSessionTerminated);
    return () => window.removeEventListener('whd_session_terminated', onSessionTerminated);
  }, [handleSessionDestroyed]);

  // Sync across tabs via storage event
  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === 'whd_user_auth' && !e.newValue) {
        setUserAuth(null);
      }
      if (e.key === 'whd_admin_auth' && !e.newValue) {
        setAdminAuth(null);
      }
      if (e.key === 'whd_superadmin_auth' && !e.newValue) {
        setSuperadminAuth(null);
      }
    };
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  // Periodic heartbeat: Checks every 3 seconds whether the currently active account still exists in DB
  useEffect(() => {
    const checkActiveSession = async () => {
      if (location.pathname.startsWith('/admin')) {
        if (adminAuth?.token) {
          try {
            const res = await window.fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${adminAuth.token}` }
            });
            if (res.status === 401) {
              const data = await res.json().catch(() => ({}));
              handleSessionDestroyed('admin', data.message || 'Admin account has been deleted. Session destroyed.');
            }
          } catch (e) {}
        }
      } else if (location.pathname.startsWith('/superadmin')) {
        if (superadminAuth?.token) {
          try {
            const res = await window.fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${superadminAuth.token}` }
            });
            if (res.status === 401) {
              const data = await res.json().catch(() => ({}));
              handleSessionDestroyed('superadmin', data.message || 'SuperAdmin session expired.');
            }
          } catch (e) {}
        }
      } else {
        if (userAuth?.token) {
          try {
            const res = await window.fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${userAuth.token}` }
            });
            if (res.status === 401) {
              const data = await res.json().catch(() => ({}));
              handleSessionDestroyed('user', data.message || 'Employee account has been deleted. Session destroyed.');
            }
          } catch (e) {}
        }
      }
    };

    const intervalId = setInterval(checkActiveSession, 3000);
    window.addEventListener('focus', checkActiveSession);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', checkActiveSession);
    };
  }, [location.pathname, userAuth?.token, adminAuth?.token, superadminAuth?.token, handleSessionDestroyed]);

  const handleLogout = (role) => {
    if (role === 'user') {
      setUserAuth(null);
      localStorage.removeItem('whd_user_auth');
    } else if (role === 'admin') {
      setAdminAuth(null);
      localStorage.removeItem('whd_admin_auth');
    } else if (role === 'superadmin') {
      setSuperadminAuth(null);
      localStorage.removeItem('whd_superadmin_auth');
    }

    try {
      sessionStorage.clear();
    } catch (e) {}

    // Hard reload so all in-memory credentials, inputs, and components are fully reset
    window.location.reload();
  };

  // Select active auth based strictly on the current URL
  const getCurrentAuth = () => {
    if (location.pathname.startsWith('/superadmin')) {
      return superadminAuth;
    }
    if (location.pathname.startsWith('/admin')) {
      return adminAuth;
    }
    return userAuth;
  };

  const isSuperadminPath = location.pathname.startsWith('/superadmin') || location.pathname.startsWith('/super-admin');
  const isAdminPath = location.pathname.startsWith('/admin');
  const isUiPreviewPath = location.pathname.startsWith('/ui-preview');
  const isMedportalPath = isSuperadminPath || isAdminPath;

  return (
    <div className={`app-layout ${isMedportalPath ? 'superadmin-full-layout' : ''} bg-medical-grid`}>
      {!isMedportalPath && !isUiPreviewPath && (
        <>
          <PharmaAtmosphere />
          <PharmaThemeDrawer showToast={showToast} />
        </>
      )}

      {/* Top Navigation Bar: Shown on User Campaign Portal, hidden on World Heart Day admin dashboards */}
      {!isMedportalPath && (
        <Navbar
          currentAuth={getCurrentAuth()}
          superadminAuth={superadminAuth}
          onLogout={handleLogout}
          userPortalView={userPortalView}
          onToggleUserView={() => setUserPortalView((prev) => (prev === 'doctors' ? 'onboarding' : 'doctors'))}
          onNavigateHome={() => setUserPortalView('onboarding')}
        />
      )}

      {/* Main Content Routed by URL - Open navigation across all portals */}
      <main className={isMedportalPath ? 'superadmin-main-wrapper' : 'app-main'}>
        <Routes>
          {/* User Portal Route (/) */}
          <Route
            path="/"
            element={
              <HomePage
                userAuth={userAuth}
                superadminAuth={superadminAuth}
                onLoginSuccess={handleLoginSuccess}
                showToast={showToast}
                onLogout={handleLogout}
                userPortalView={userPortalView}
                setUserPortalView={setUserPortalView}
              />
            }
          />
          <Route
            path="/home"
            element={<Navigate to="/" replace />}
          />

          {/* Standalone Clinical Pharma Portal UI Showcase Route (/ui-preview) */}
          <Route
            path="/ui-preview"
            element={<PharmaPortalPreview />}
          />

          {/* Admin Panel Route (/admin) */}
          <Route
            path="/admin"
            element={
              <AdminPanel
                adminAuth={adminAuth}
                onLoginSuccess={handleLoginSuccess}
                showToast={showToast}
                onLogout={handleLogout}
              />
            }
          />

          {/* Superadmin Panel Route (/superadmin and /super-admin) */}
          <Route
            path="/superadmin"
            element={
              <SuperadminPanel
                superadminAuth={superadminAuth}
                onLoginSuccess={handleLoginSuccess}
                showToast={showToast}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/super-admin"
            element={<Navigate to="/superadmin" replace />}
          />

          {/* Fallback to Home */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' && <CheckCircle2 size={18} color="#10b981" />}
              {t.type === 'error' && <AlertCircle size={18} color="#e63946" />}
              {t.type === 'info' && <Info size={18} color="#0284c7" />}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
