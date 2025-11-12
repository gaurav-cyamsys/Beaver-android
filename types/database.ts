export interface Device {
  id: string;
  device_name: string;
  device_id: string;
  user_id: string;
  created_at: string;
  last_sync: string | null;
  is_online: boolean;
}

export interface Sensor {
  id: string;
  sensor_id: string;
  device_id: string;
  gauge_factor: number;
  initial_reading: number;
  remark: string;
  created_at: string;
  calibration_timestamp: string;
}

export interface Reading {
  id: string;
  sensor_id: string;
  device_id: string;
  frequency: number;
  temperature: number;
  final_load: number | null;
  digits: number | null;
  battery: number;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  full_name: string | null;
  created_at: string;
}

export interface UARTData {
  Freq: number;
  Temp: number;
  Bat: number;
}

export interface UARTCommand {
  Cmd: 'Send' | 'Stop';
}
