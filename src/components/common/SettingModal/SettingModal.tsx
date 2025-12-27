import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Cấu hình mặc định (dựa trên vite.config.ts của bạn)
const DEFAULT_CONFIG = {
  apiBaseUrl: "http://localhost:31313",
  vecBaseUrl: "http://192.168.2.130:8686/v1",
  fraBaseUrl: "http://192.168.2.130:2022",
  detBaseUrl: "http://192.168.2.130:2468",
  wsBaseUrl: "ws://192.168.2.130:5171"
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Load từ localStorage khi mở modal
  useEffect(() => {
    if (isOpen) {
      const savedConfig = localStorage.getItem('APP_CONFIG');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    localStorage.setItem('APP_CONFIG', JSON.stringify(config));
    alert("Settings saved! Please reload the page to apply changes.");
    window.location.reload(); // Reload để các service nhận config mới
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('APP_CONFIG');
    alert("Reset to default!");
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>System Configuration</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          <p style={styles.note}>Override default proxy settings (Direct Connection)</p>
          
          <div style={styles.inputGroup}>
            <label>Main API (/api)</label>
            <input name="apiBaseUrl" value={config.apiBaseUrl} onChange={handleChange} style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label>Vector API (/vec-api)</label>
            <input name="vecBaseUrl" value={config.vecBaseUrl} onChange={handleChange} style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label>Face API (/fra-api)</label>
            <input name="fraBaseUrl" value={config.fraBaseUrl} onChange={handleChange} style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label>Detection API (/det-api)</label>
            <input name="detBaseUrl" value={config.detBaseUrl} onChange={handleChange} style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label>System WS (/sys-ws)</label>
            <input name="wsBaseUrl" value={config.wsBaseUrl} onChange={handleChange} style={styles.input} />
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={handleReset} style={styles.resetBtn}>Reset Default</button>
          <button onClick={handleSave} style={styles.saveBtn}>Save & Reload</button>
        </div>
      </div>
    </div>
  );
};

// Inline Styles cho nhanh gọn
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  modal: {
    backgroundColor: 'white', padding: '24px', borderRadius: '12px',
    width: '450px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  body: { display: 'flex', flexDirection: 'column', gap: '12px' },
  note: { fontSize: '13px', color: '#666', margin: '0 0 10px 0', fontStyle: 'italic' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  footer: { marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  saveBtn: { padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  resetBtn: { padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }
};

export default SettingsModal;