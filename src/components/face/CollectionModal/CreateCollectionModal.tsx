import React, { useState } from 'react';
import styles from './CreateCollectionModal.module.css';
import { collectionService, type CollectionConfig } from '../../../services/collectionService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (collectionName: string) => void; // Callback khi tạo xong
}

const CreateCollectionModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [vectorSize, setVectorSize] = useState<number>(512); // Default phổ biến
  const [distance, setDistance] = useState('Cosine');
  const [idType, setIdType] = useState('String');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return alert("Vui lòng nhập tên Collection");
    
    setLoading(true);
    try {
      const payload: CollectionConfig = {
        name: name,
        vector_size: vectorSize,
        distance: distance,
        id_type: idType
      };
      
      await collectionService.create(payload);
      
      alert(`Đã tạo collection "${name}" thành công!`);
      onSuccess(name); // Điền tự động tên collection vừa tạo vào ô input cha
      onClose();
    } catch (error) {
      console.error(error);
      alert("Tạo collection thất bại. Có thể tên đã tồn tại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span>Tạo Collection Mới</span>
          <span style={{cursor:'pointer'}} onClick={onClose}>✕</span>
        </div>

        {/* 1. Name */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Tên Collection (Viết liền, không dấu)</label>
          <input 
            className={styles.input} 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="VD: employees_hcm"
            autoFocus
          />
        </div>

        {/* 2. Vector Size */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Kích thước Vector (Vector Size)</label>
          <input 
            type="number" 
            className={styles.input} 
            value={vectorSize} 
            onChange={e => setVectorSize(Number(e.target.value))} 
          />
          <small style={{color:'#888', fontSize:'11px'}}>Thường là 128, 512 hoặc 1024 tùy model AI.</small>
        </div>

        {/* 3. Distance Metric */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Thuật toán khoảng cách</label>
          <select className={styles.select} value={distance} onChange={e => setDistance(e.target.value)}>
            <option value="Cosine">Cosine (Khuyên dùng)</option>
            <option value="Euclidean">Euclidean (L2)</option>
            <option value="DotProduct">Dot Product</option>
          </select>
        </div>

        {/* 4. ID Type */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Kiểu dữ liệu ID</label>
          <select className={styles.select} value={idType} onChange={e => setIdType(e.target.value)}>
            <option value="String">String (Chuỗi ký tự)</option>
            <option value="Int">Integer (Số nguyên)</option>
          </select>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
          <button className={styles.btnSave} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCollectionModal;