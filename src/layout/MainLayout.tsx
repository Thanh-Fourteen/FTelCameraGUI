import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar/Sidebar';
import styles from './MainLayout.module.css';

export const MainLayout: React.FC = () => {
  // State quản lý trạng thái thu gọn
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={styles.layoutWrapper}>
      {/* Truyền props xuống Sidebar */}
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

      <main className={styles.mainContent}>
        <div className={styles.pageContainer}>
             <Outlet />
        </div>
      </main>
    </div>
  );
};