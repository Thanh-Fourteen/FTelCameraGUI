import React, { useState, useEffect } from 'react';
import { instanceService, type VastInstance } from '../../../services/instanceService';
import { useNotification } from '../../../context/NotificationContext';

interface BackendInstanceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PortMappingRow {
  internal: string;
  public: string;
}

const BackendInstanceManager: React.FC<BackendInstanceManagerProps> = ({ isOpen, onClose, onSuccess }) => {
  const { notify } = useNotification();
  
  // --- STATE ---
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list'); 
  const [isEditing, setIsEditing] = useState(false); // Flag để biết đang Add hay Edit
  const [instances, setInstances] = useState<VastInstance[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    instance_id: '',
    ip_address: '',
    port: 8000,
  });

  // Advanced: Port Mappings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [portRows, setPortRows] = useState<PortMappingRow[]>([
    { internal: '5551', public: '' }
  ]);

  // --- FETCH LIST ---
  const fetchInstances = async () => {
    setLoading(true);
    try {
      const data = await instanceService.getAll();
      setInstances(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && viewMode === 'list') {
      fetchInstances();
    }
  }, [isOpen, viewMode]);

  // --- HANDLERS ---

  const resetForm = () => {
    setFormData({ instance_id: '', ip_address: '', port: 8000 });
    setPortRows([{ internal: '5551', public: '' }]);
    setIsEditing(false);
    setShowAdvanced(false);
  };

  // Chuyển sang chế độ Add
  const handleOpenAdd = () => {
    resetForm();
    setViewMode('form');
  };

  // Chuyển sang chế độ Edit
  const handleOpenEdit = (inst: VastInstance) => {
    setIsEditing(true);
    
    // 1. Fill thông tin cơ bản
    setFormData({
        instance_id: inst.instance_id,
        ip_address: inst.ip_address,
        port: inst.port
    });

    // 2. Fill Port Mappings (Convert Object -> Array)
    // Backend trả về: { "5551": 20001, "8080": 20002 }
    const mappings: PortMappingRow[] = [];
    if (inst.port_mappings) {
        Object.entries(inst.port_mappings).forEach(([internal, pub]) => {
            mappings.push({ internal, public: String(pub) });
        });
    }

    console.log("Loaded port mappings for edit:", mappings);
    // Nếu không có mapping nào thì để dòng mặc định
    if (mappings.length === 0) mappings.push({ internal: '5551', public: '' });
    
    setPortRows(mappings);
    
    // Mở sẵn Advanced nếu có mapping
    if (mappings.length > 0 && mappings[0].public !== '') {
        setShowAdvanced(true);
    }

    setViewMode('form');
  };

  const handlePortChange = (index: number, field: keyof PortMappingRow, value: string) => {
    const newRows = [...portRows];
    newRows[index][field] = value;
    setPortRows(newRows);
  };

  const addPortRow = () => setPortRows([...portRows, { internal: '', public: '' }]);
  const removePortRow = (index: number) => setPortRows(portRows.filter((_, i) => i !== index));

  // --- SUBMIT (ADD OR EDIT) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const mappingDict: Record<string, number> = {};
      portRows.forEach(row => {
        if (row.internal && row.public) {
          mappingDict[row.internal] = parseInt(row.public);
        }
      });

      const payload = {
        ...formData,
        port_mappings: mappingDict,
        kafka_topics: '', 
        cameras: ''      
      };

      if (isEditing) {
          // GỌI API UPDATE
          await instanceService.update(formData.instance_id, payload);
          notify(`Instance ${formData.instance_id} updated`, "success");
      } else {
          // GỌI API REGISTER
          await instanceService.register(payload);
          notify("Instance added successfully", "success");
      }
      
      onSuccess(); 
      setViewMode('list'); 
      resetForm();

    } catch (error) {
      console.error('Error saving instance:', error);
      notify("Failed to save instance", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Delete instance ${id}?`)) return;
    try {
      // Gọi service delete (nhớ bổ sung hàm này vào service nếu chưa có)
      await instanceService.delete(id); 
      notify("Instance deleted", "success");
      fetchInstances();
      onSuccess();
    } catch (error) {
      notify("Error deleting instance", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>{viewMode === 'list' ? 'Backend Nodes Manager' : (isEditing ? 'Edit Instance' : 'Add New Instance')}</h3>
          <button onClick={onClose} style={styles.closeIcon}>&times;</button>
        </div>

        {/* --- LIST VIEW --- */}
        {viewMode === 'list' && (
          <div>
            <div style={styles.listContainer}>
              {loading ? <div style={{textAlign: 'center', padding: 20}}>Loading...</div> : (
                instances.length === 0 ? <p style={{color: '#999', textAlign: 'center'}}>No instances found.</p> :
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>IP</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map(inst => (
                      <tr key={inst.instance_id}>
                        <td style={styles.td}>
                            <div style={{fontWeight: 600}}>{inst.instance_id}</div>
                            <div style={{fontSize: 11, color: '#666'}}>Port: {inst.port}</div>
                        </td>
                        <td style={styles.td}>{inst.ip_address}</td>
                        <td style={styles.td}>
                          <div style={{display: 'flex', gap: 6}}>
                              {/* NÚT EDIT */}
                              <button 
                                onClick={() => handleOpenEdit(inst)}
                                style={styles.editBtnSmall}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              {/* NÚT DELETE */}
                              <button 
                                onClick={() => handleDelete(inst.instance_id)}
                                style={styles.deleteBtnSmall}
                                title="Delete"
                              >
                                🗑️
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div style={styles.footer}>
               <button onClick={handleOpenAdd} style={styles.primaryBtn}>
                 + Add New Instance
               </button>
            </div>
          </div>
        )}

        {/* --- FORM VIEW (ADD / EDIT) --- */}
        {viewMode === 'form' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
                <label style={styles.label}>Instance ID {isEditing && <span style={{fontSize: 11, color: '#ef4444'}}>(Read-only)</span>}</label>
                <input required placeholder="e.g. vast-01" 
                  value={formData.instance_id} 
                  onChange={e => setFormData({...formData, instance_id: e.target.value})} 
                  style={styles.input} 
                  // KHÓA ID NẾU ĐANG EDIT
                  disabled={isEditing} 
                />
            </div>
            
            <div style={{display: 'flex', gap: 10}}>
                <div style={{flex: 2, ...styles.formGroup}}>
                    <label style={styles.label}>Public IP Address</label>
                    <input required placeholder="x.x.x.x" 
                        value={formData.ip_address} 
                        onChange={e => setFormData({...formData, ip_address: e.target.value})} 
                        style={styles.input} 
                    />
                </div>
                <div style={{flex: 1, ...styles.formGroup}}>
                    <label style={styles.label}>API Port</label>
                    <input type="number" required placeholder="8000" 
                        value={formData.port} 
                        onChange={e => setFormData({...formData, port: Number(e.target.value)})} 
                        style={styles.input} 
                    />
                </div>
            </div>

            {/* ADVANCED: PORT MAPPING */}
            <div style={styles.advancedSection}>
                <div 
                    onClick={() => setShowAdvanced(!showAdvanced)} 
                    style={styles.advancedToggle}
                >
                    {showAdvanced ? '▼' : '▶'} Advanced: Manual Port Mapping ({portRows.filter(r => r.public).length})
                </div>

                {showAdvanced && (
                    <div style={styles.mappingContainer}>
                        <p style={{fontSize: 12, color: '#666', marginTop: 0}}>
                            Map internal Docker ports to Vast.ai public ports.
                        </p>
                        
                        <div style={{display: 'flex', gap: 10, marginBottom: 5, fontSize: 12, fontWeight: 'bold'}}>
                            <span style={{flex: 1}}>Internal Port</span>
                            <span style={{flex: 1}}>Public Port</span>
                            <span style={{width: 24}}></span>
                        </div>

                        {portRows.map((row, idx) => (
                            <div key={idx} style={{display: 'flex', gap: 10, marginBottom: 8}}>
                                <input 
                                    placeholder="5551"
                                    value={row.internal}
                                    onChange={(e) => handlePortChange(idx, 'internal', e.target.value)}
                                    style={{...styles.input, flex: 1}}
                                />
                                <span style={{display: 'flex', alignItems: 'center'}}>→</span>
                                <input 
                                    placeholder="20xxx"
                                    value={row.public}
                                    onChange={(e) => handlePortChange(idx, 'public', e.target.value)}
                                    style={{...styles.input, flex: 1}}
                                />
                                <button type="button" onClick={() => removePortRow(idx)} style={styles.removeRowBtn}>×</button>
                            </div>
                        ))}

                        <button type="button" onClick={addPortRow} style={styles.addRowBtn}>+ Add Port</button>
                    </div>
                )}
            </div>

            <div style={styles.actions}>
              <button type="button" onClick={() => { setViewMode('list'); resetForm(); }} style={styles.cancelBtn}>Back</button>
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? 'Saving...' : (isEditing ? 'Update Instance' : 'Add Instance')}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

// --- STYLES (Thêm style cho nút Edit) ---
const styles = {
  // ... (giữ nguyên các style cũ)
  overlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: 12, width: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  header: { padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' },
  closeIcon: { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666' },
  listContainer: { padding: 20, maxHeight: '400px', overflowY: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '8px', borderBottom: '2px solid #eee', fontSize: 13, color: '#666' },
  td: { padding: '8px', borderBottom: '1px solid #eee', fontSize: 14, verticalAlign: 'middle' },
  
  // Style nút Edit và Delete
  editBtnSmall: { background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 14 },
  deleteBtnSmall: { background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 14 },

  form: { padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 15, overflowY: 'auto' as const },
  formGroup: {},
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' as const, fontSize: 14 },
  
  advancedSection: { borderTop: '1px solid #eee', paddingTop: 10 },
  advancedToggle: { cursor: 'pointer', color: '#2563eb', fontSize: 13, fontWeight: 600, userSelect: 'none' as const },
  mappingContainer: { marginTop: 10, background: '#f3f4f6', padding: 10, borderRadius: 6 },
  removeRowBtn: { background: '#ef4444', color: 'white', border: 'none', width: 24, height: 24, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addRowBtn: { background: 'none', border: '1px dashed #999', color: '#666', width: '100%', padding: 5, borderRadius: 4, cursor: 'pointer', fontSize: 12 },

  footer: { padding: 20, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  primaryBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  submitBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  cancelBtn: { background: 'white', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', color: '#374151' }
};

export default BackendInstanceManager;