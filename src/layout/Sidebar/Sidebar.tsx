import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../../components/common/SettingModal/SettingModal'; // Import Modal vừa tạo
import styles from './Sidebar.module.css';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const MENU_ITEMS = [
  { path: '/', label: 'Overview', icon: '🏠' },
  { path: '/camera', label: 'Camera Management', icon: '📹' },
  { path: '/face-register', label: 'Face registration', icon: '👤' },
  { path: '/image-analysis', label: 'Image Analysis', icon: '🖼️' },
  { path: '/model-comparison', label: 'Model Comparison', icon: '⚔️' },
];

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();
  
  // State quản lý Modal Setting
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleFooterClick = () => {
    if (isAuthenticated) {
      const confirm = window.confirm("Are you sure you want to sign out?");
      if (confirm) {
        signOut();
        navigate('/auth'); // Đã sửa thành /auth theo file AuthPage
      }
    } else {
      navigate('/auth');
    }
  };

  return (
    <>
      <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        
        {/* Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>👁️</div>
          {!isCollapsed && <span className={styles.logoText}>Smart Camera</span>}
          <button className={styles.toggleBtn} onClick={onToggle}>
            {isCollapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Menu */}
        <nav className={styles.nav}>
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              title={isCollapsed ? item.label : ''}
              end={item.path === '/'}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* --- SETTINGS BUTTON (Nằm trên vách ngăn) --- */}
        <div className={styles.settingsContainer}>
           <button 
              className={styles.settingsBtn} 
              onClick={() => setIsSettingsOpen(true)}
              title="Configuration"
           >
              <span className={styles.navIcon}>⚙️</span>
              {!isCollapsed && <span className={styles.navLabel}>Settings</span>}
           </button>
        </div>

        {/* Footer — Authentication Logic */}
        <div 
          className={styles.footer} 
          onClick={handleFooterClick} 
          style={{ cursor: 'pointer' }}
          title={isAuthenticated ? "Click to Logout" : "Click to Sign In"}
        >
          <div className={styles.userProfile}>
            <div className={styles.avatar} style={{ backgroundColor: isAuthenticated ? '#3b82f6' : '#94a3b8' }}>
              {isAuthenticated ? 'A' : '?'}
            </div>
            {!isCollapsed && (
              <div className={styles.userInfo}>
                {isAuthenticated ? (
                  <>
                    <div className={styles.userName}>Admin User</div>
                    <div className={styles.userRole}>Super Admin</div>
                  </>
                ) : (
                  <>
                    <div className={styles.userName}>Guest</div>
                    <div className={styles.userRole}>Please Sign In</div>
                  </>
                )}
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button className={styles.logoutBtn}>
              {isAuthenticated ? '⇥' : '→'}
            </button>
          )}
        </div>
      </div>

      {/* Render Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default Sidebar;