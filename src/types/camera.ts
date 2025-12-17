// src/types/camera.ts

// 1. Cấu hình Settings (Backend trả về)
export interface SchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  options?: string[]; // Dùng cho type 'select'
  default?: any;
}

export interface ServiceSchema {
  label: string;
  fields: SchemaField[];
}

export interface SettingsSchema {
  [serviceName: string]: ServiceSchema;
}

// --- Cập nhật CameraSettings ---
export interface CameraSettings {
  modules: string[];
  polygon: number[][];
  plot_mode: string;
  alert_mode: string;
  
  // THÊM DÒNG NÀY:
  model?: string; 
  config: Record<string, Record<string, any>>; 
}

// Update Payload
export interface CreateCameraPayload {
  camera_id: string;
  rtsp_url: string;
  ws_port: number;
  settings: CameraSettings;
}

export interface Camera extends CreateCameraPayload {
  id: string;
  name: string;
  status: string;
  output_topic: string;
  isLive?: boolean;
  thumbnailUrl?: string;

  node_id?: string;
  node_ip?: string;    
  ip_address?: string;
  
  internal_port?: number;
  public_port?: number;   
  
  stream_url?: string;    

}