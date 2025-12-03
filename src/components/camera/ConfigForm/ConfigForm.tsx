import React from 'react';
import type { SettingsSchema, SchemaField } from '../../../types/camera';
import styles from './ConfigForm.module.css'; // Bạn tự tạo file css rỗng hoặc copy style input cũ

interface ConfigFormProps {
  schema: SettingsSchema | null;
  selectedModules: string[];
  config: Record<string, any>;
  onChange: (serviceName: string, key: string, value: any) => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ schema, selectedModules, config, onChange }) => {
  if (!schema) return <div>Loading settings...</div>;

  // Lọc ra các service cần hiển thị:
  // 1. Luôn hiện 'viewer_service'
  // 2. Hiện các service có trong selectedModules (Lưu ý: Backend trả key là 'pythera_detection' nhưng module id có thể là 'detection')
  // -> Ta cần map đúng ID. Theo schema bạn gửi: 'pythera_detection', 'tracking_service'...
  // -> Code modal bạn dùng ID: 'detection', 'tracking_service'. Cần mapping nhẹ nếu tên không khớp.
  
  // Với cấu trúc hiện tại, ta cứ render hết những key có trong schema mà MATCH với logic module
  const servicesToRender = Object.keys(schema).filter(serviceKey => {
    if (serviceKey === 'viewer_service') return true; // Luôn hiện
    
    // Check xem serviceKey có nằm trong list module đã chọn không
    // Map tên serviceKey sang module ID (nếu cần). 
    // Ví dụ: schema key "pythera_detection" tương ứng module "detection"
    if (serviceKey === 'pythera_detection' && selectedModules.includes('detection')) return true;
    if (serviceKey === 'tracking_service' && selectedModules.includes('tracking_service')) return true;
    if (serviceKey === 'pose_detection' && selectedModules.includes('pose_detection')) return true;
    if (serviceKey === 'action_recognition' && selectedModules.includes('action_recognition')) return true;
    if (serviceKey === 'face_service' && selectedModules.includes('face')) return true;
    if (serviceKey === 'fire_service' && selectedModules.includes('fire')) return true;
    if (serviceKey === 'counting_service' && selectedModules.includes('counting')) return true;

    return false; 
  });

  const renderField = (serviceName: string, field: SchemaField) => {
    // Lấy giá trị hiện tại, nếu chưa có thì lấy default
    const currentVal = config[serviceName]?.[field.key] ?? field.default;

    const handleChange = (e: any) => {
      let val = e.target.value;
      if (field.type === 'number') val = Number(val);
      if (field.type === 'boolean') val = e.target.checked;
      onChange(serviceName, field.key, val);
    };

    switch (field.type) {
      case 'select':
        return (
          <select value={currentVal} onChange={handleChange} className={styles.input}>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'boolean':
        return (
            <input 
                type="checkbox" 
                checked={!!currentVal} 
                onChange={handleChange} 
                style={{width: '20px', height: '20px'}}
            />
        );
      case 'textarea':
        return (
            <textarea 
                className={styles.input} 
                value={currentVal} 
                onChange={handleChange}
                rows={3}
            />
        );
      default: // text, number
        return (
          <input
            type={field.type}
            className={styles.input}
            value={currentVal}
            onChange={handleChange}
          />
        );
    }
  };

  return (
    <div className={styles.container}>
      {servicesToRender.map(serviceKey => (
        <div key={serviceKey} className={styles.serviceBlock}>
          <h4 className={styles.serviceTitle}>{schema[serviceKey].label}</h4>
          <div className={styles.fieldsGrid}>
            {schema[serviceKey].fields.map(field => (
              <div key={field.key} className={styles.fieldGroup}>
                <label className={styles.label}>{field.label}</label>
                {renderField(serviceKey, field)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConfigForm;