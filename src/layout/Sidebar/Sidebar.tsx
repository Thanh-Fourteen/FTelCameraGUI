import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // <-- Import Hook
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
  const { isAuthenticated, signOut } = useAuth(); // Lấy state từ context

  const handleFooterClick = () => {
    if (isAuthenticated) {
      // Logic Logout
      const confirm = window.confirm("Are you sure you want to sign out?");
      if (confirm) {
        signOut();
        navigate('/auth');
      }
    } else {
      // Logic Login
      navigate('/auth');
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

      {/* Footer — Authentication Logic */}
      <div 
        className={styles.footer} 
        onClick={handleFooterClick} 
        style={{ cursor: 'pointer' }}
        title={isAuthenticated ? "Click to Logout" : "Click to Sign In"}
      >
        <div className={styles.userProfile}>
          {/* Avatar thay đổi theo trạng thái */}
          <div className={styles.avatar} style={{ backgroundColor: isAuthenticated ? '#3b82f6' : '#94a3b8' }}>
            {isAuthenticated ? 'A' : '?'}
          </div>

          {/* Thông tin User hiển thị nếu chưa collapse */}
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

        {/* Nút Logout / Login */}
        {!isCollapsed && (
          <button className={styles.logoutBtn}>
            {isAuthenticated ? '⇥' : '→'} {/* Icon khác nhau */}
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;