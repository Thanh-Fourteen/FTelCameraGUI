import React, { useState } from 'react';
import styles from './SharedHeader.module.css';
import BackendInstanceManager from './BackendInstanceManager'; 
import { type VastInstance } from '../../../services/instanceService';

interface SharedHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  
  kafkaState: {
    isEnabled: boolean;
    isToggling: boolean;
    onToggle: () => void;
  };

  instances: VastInstance[]; 
  selectedInstanceId: string | 'all'; 
  onInstanceChange: (id: string | 'all') => void; 
  onRefreshInstances: () => void; 

  children?: React.ReactNode;
}

const SharedHeader: React.FC<SharedHeaderProps> = ({ 
  title, subtitle, onBack, kafkaState, children,
  instances, selectedInstanceId, onInstanceChange, onRefreshInstances
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        {/* LEFT: Title & Back Button */}
        <div className={styles.leftSection}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>← Back</button>
          )}
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>

        {/* CENTER: Backend Instance Selector */}
        <div className={styles.centerSection}>
           <div className={styles.instanceSelector}>
              <span className={styles.label}>Backend:</span>
              <select 
                value={selectedInstanceId} 
                onChange={(e) => onInstanceChange(e.target.value)}
                className={styles.select}
              >
                 <option value="all">🌍 All Instances (Global)</option>
                 <optgroup label="Specific Instances">
                    {instances.map(inst => (
                        <option key={inst.instance_id} value={inst.instance_id}>
                           🖥️ {inst.instance_id} ({inst.status})
                        </option>
                    ))}
                 </optgroup>
              </select>
              
              <button 
                className={styles.addBtn} 
                onClick={() => setIsModalOpen(true)}
                title="Add new Backend Instance"
              >
                +
              </button>
           </div>
        </div>

        {/* RIGHT: Actions & Controls */}
        <div className={styles.rightSection}>
          {children && <div className={styles.customActions}>{children}</div>}

          {/* --- SỬA Ở ĐÂY: Chỉ hiện Kafka khi KHÔNG chọn 'all' --- */}
          {selectedInstanceId !== 'all' && (
            <div className={styles.kafkaControl}>
                <span className={styles.kafkaLabel}>Kafka</span>
                <div 
                className={`${styles.switchBase} ${kafkaState.isEnabled ? styles.active : ''}`}
                onClick={kafkaState.isToggling ? undefined : kafkaState.onToggle}
                >
                <div className={`${styles.switchKnob} ${kafkaState.isEnabled ? styles.knobActive : ''}`} />
                </div>
            </div>
          )}
          {/* -------------------------------------------------------- */}

          <div className={styles.userAvatar}>
            <img src="/logo.jpg" alt="User" />
          </div>
        </div>
      </header>
      
      <BackendInstanceManager 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={onRefreshInstances} 
      />
    </>
  );
};

export default SharedHeader;