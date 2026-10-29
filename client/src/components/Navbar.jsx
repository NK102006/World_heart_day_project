import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Stethoscope, LogOut, PlusCircle, Menu, X } from 'lucide-react';

export default function Navbar({ currentAuth, superadminAuth, onLogout, userPortalView, onToggleUserView, onNavigateHome }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Close mobile dropdown menu on route change or view toggle
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, userPortalView]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleBrandClick = () => {
    setIsMobileMenuOpen(false);
    if (onNavigateHome) {
      onNavigateHome();
    }
    navigate('/');
  };

  const activeRole = currentAuth?.user?.role || (
    location.pathname.startsWith('/superadmin')
      ? 'superadmin'
      : location.pathname.startsWith('/admin')
      ? 'admin'
      : 'user'
  );

  const displayName = currentAuth?.user?.name && currentAuth.user.name.toLowerCase() !== 'user'
    ? currentAuth.user.name
    : (currentAuth?.user?.employeeId || currentAuth?.user?.name || 'EMP1001');

  const isUiPreview = location.pathname.startsWith('/ui-preview');

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-2.5">
        
        {/* Brand Identity */}
        <div
          className="flex items-center gap-2 sm:gap-3.5 cursor-pointer select-none group min-w-0"
          onClick={handleBrandClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleBrandClick();
            }
          }}
          title="World Heart Day 2026 Home"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 relative overflow-hidden group-hover:scale-105 transition-transform flex-shrink-0">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <i className="ph-fill ph-heartbeat text-xl sm:text-2xl"></i>
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-slate-900 text-sm sm:text-lg leading-tight tracking-tight truncate">World Heart Day</h1>
            <p className="font-script text-teal-600 text-xs sm:text-base leading-none mt-0.5 truncate">My Heart. My Promise.</p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* "All Doctors" / "Register Doctor" Button - Desktop Only */}
          {currentAuth?.user && activeRole === 'user' && !isUiPreview && (
            <button
              type="button"
              onClick={onToggleUserView}
              className="hidden md:flex btn-pharma-primary text-white text-xs font-semibold px-4 py-2.5 rounded-full items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all whitespace-nowrap"
              title={userPortalView === 'doctors' ? 'Register New Doctor' : 'View All Registered Doctors'}
            >
              {userPortalView === 'doctors' ? (
                <>
                  <PlusCircle size={15} />
                  <span>Register Doctor</span>
                </>
              ) : (
                <>
                  <Stethoscope size={15} />
                  <span>All Doctors</span>
                </>
              )}
            </button>
          )}

          {/* Mobile User ID Text Badge (Shown only in Mobile View) */}
          {currentAuth?.user && (
            <div className="md:hidden flex items-center bg-slate-100/95 border border-slate-200/90 rounded-full py-1 px-2.5 gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">{displayName}</span>
            </div>
          )}

          {/* Desktop User Badge & Logout Pill (Hidden on Mobile) */}
          {currentAuth?.user && (
            <div className="hidden md:flex items-center bg-slate-100/90 border border-slate-200/90 rounded-full p-1 pl-3.5 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-700 tracking-wide">{displayName}</span>
              </div>
              <button
                type="button"
                onClick={() => onLogout(activeRole)}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-700 border border-slate-200/90 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                title="Logout"
              >
                <LogOut size={12} className="text-teal-600" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Button with Compact Dropdown (Small Sidebar) Opening Directly Below */}
          {currentAuth?.user && (
            <div className="relative md:hidden" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors shadow-2xs cursor-pointer flex-shrink-0 ${
                  isMobileMenuOpen
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-slate-100 hover:bg-teal-50 border-slate-200 text-slate-700 hover:text-teal-700'
                }`}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                title="Menu"
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              {/* Compact 2-Button Dropdown Menu */}
              {isMobileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200/90 p-2 flex flex-col gap-1.5 z-50 animate-popover"
                  style={{
                    boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* Button 1: All Doctors / Register Doctor Toggle */}
                  {activeRole === 'user' && !isUiPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (onToggleUserView) onToggleUserView();
                      }}
                      className="w-full btn-pharma-primary text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                    >
                      {userPortalView === 'doctors' ? (
                        <>
                          <PlusCircle size={15} />
                          <span>Register Doctor</span>
                        </>
                      ) : (
                        <>
                          <Stethoscope size={15} />
                          <span>All Doctors</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Button 2: Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogout(activeRole);
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/90 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                  >
                    <LogOut size={14} className="text-red-600" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
