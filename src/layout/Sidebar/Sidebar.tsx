import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';// <-- import hook auth của bạn
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
];

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();

  const handleFooterClick = () => {
    if (isAuthenticated) {
      signOut();                  // nếu đang login → logout
      navigate('/sign-in');        // điều hướng đến Sign In
    } else {
      navigate('/sign-in');        // chưa login → sang Sign In
    }
  };

  return (
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

      {/* Footer — xử lý click */}
      <div className={styles.footer} onClick={handleFooterClick} style={{ cursor: 'pointer' }}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>A</div>
          {!isCollapsed && (
            <div className={styles.userInfo}>
                <div className={styles.userName}>Admin</div>
                <div className={styles.userRole}>Super Admin</div>
            </div>
          )}
        </div>

        {!isCollapsed &&
          <button className={styles.logoutBtn}>
            {isAuthenticated ? '⇥' : '→'}
          </button>
        }
      </div>
    </div>
  );
};

export default Sidebar;
