import React, { createContext, useState, useContext, useCallback } from 'react';
import styles from './Notification.module.css';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 1. Định nghĩa cấu trúc cho nút bấm (Action)
export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary'; // Màu sắc nút
}

interface Notification {
  id: number;
  type: NotificationType;
  title?: string;
  message: string;
  actions?: NotificationAction[]; // <--- Thêm cái này
}

interface NotificationContextType {
  // Cập nhật hàm notify nhận thêm actions và duration (mặc định 5000ms)
  notify: (
    message: string, 
    type?: NotificationType, 
    title?: string, 
    actions?: NotificationAction[],
    duration?: number
  ) => void;
  
  // Thêm hàm helper remove để dùng bên ngoài nếu cần (optional)
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((
    message: string, 
    type: NotificationType = 'info', 
    title?: string,
    actions?: NotificationAction[],
    duration: number = 5000 // Mặc định 5 giây
  ) => {
    const id = Date.now();
    
    if (!title) {
        if (type === 'error') title = 'Error';
        else if (type === 'success') title = 'Success';
        else if (type === 'warning') title = 'Warning';
        else title = 'Info';
    }

    const newNotification = { id, type, title, message, actions };

    setNotifications((prev) => [...prev, newNotification]);

    // Nếu có duration > 0 thì mới tự tắt. 
    // Nếu là confirm (có action) ta có thể muốn để duration = 0 (không bao giờ tắt tự động)
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notify, removeNotification }}>
      {children}
      
      <div className={styles.notificationContainer}>
        {notifications.map((note) => (
          <div key={note.id} className={`${styles.toast} ${styles[note.type]}`}>
            <div className={styles.content}>
              <span className={styles.title}>{note.title}</span>
              <span className={styles.message}>{note.message}</span>
              
              {/* RENDER CÁC NÚT BẤM NẾU CÓ */}
              {note.actions && note.actions.length > 0 && (
                  <div className={styles.actionsRow}>
                      {note.actions.map((action, idx) => (
                          <button
                              key={idx}
                              className={`${styles.actionBtn} ${styles[action.variant || 'default']}`}
                              onClick={() => {
                                  action.onClick();       // Chạy logic của nút
                                  removeNotification(note.id); // Tắt thông báo sau khi bấm
                              }}
                          >
                              {action.label}
                          </button>
                      ))}
                  </div>
              )}
            </div>
            
            <button 
                className={styles.closeBtn} 
                onClick={() => removeNotification(note.id)}
            >
                ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};