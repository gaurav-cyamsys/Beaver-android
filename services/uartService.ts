import { Platform, NativeEventEmitter } from 'react-native';
import { RNSerialport, actions } from 'react-native-usb-serialport';
import type { UARTData, UARTCommand } from '../types/database';

const serialportEmitter = RNSerialport ? new NativeEventEmitter(RNSerialport as any) : null;

class UARTService {
  private isConnected: boolean = false;
  private isFetching: boolean = false;
  private listeners: Array<(data: UARTData) => void> = [];
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;
  private useMockData: boolean = true;
  private devicePath: string | null = null;
  private serialSubscriptions: any[] = [];
  private dataBuffer: string = '';
  private isServiceStarted: boolean = false;

  constructor() {
    if (Platform.OS === 'android' && RNSerialport) {
      this.initializeService();
    }
  }

  private initializeService() {
    if (!serialportEmitter) return;

    console.log('UART: Initializing USB service...');

    serialportEmitter.addListener(actions.ON_SERVICE_STARTED, (response: any) => {
      console.log('UART: USB Service started', response);
      this.isServiceStarted = true;
    });

    serialportEmitter.addListener(actions.ON_SERVICE_STOPPED, (response: any) => {
      console.log('UART: USB Service stopped', response);
      this.isServiceStarted = false;
    });

    serialportEmitter.addListener(actions.ON_DEVICE_ATTACHED, (response: any) => {
      console.log('UART: Device attached', response);
    });

    serialportEmitter.addListener(actions.ON_DEVICE_DETACHED, (response: any) => {
      console.log('UART: Device detached', response);
    });

    serialportEmitter.addListener(actions.ON_CONNECTED, (response: any) => {
      console.log('UART: Device connected', response);
      this.isConnected = true;
      this.devicePath = response?.deviceName || this.devicePath;
    });

    serialportEmitter.addListener(actions.ON_DISCONNECTED, (response: any) => {
      console.log('UART: Device disconnected', response);
      if (response?.deviceName === this.devicePath) {
        this.isConnected = false;
        this.devicePath = null;
      }
    });

    serialportEmitter.addListener(actions.ON_READ_DATA, (response: any) => {
      if (response?.deviceName === this.devicePath && response?.data) {
        const dataStr = String.fromCharCode.apply(null, response.data as any);
        this.handleSerialData(dataStr);
      }
    });

    serialportEmitter.addListener(actions.ON_ERROR, (error: any) => {
      console.error('UART: Error', error);
    });

    try {
      RNSerialport.startUsbService();
    } catch (error) {
      console.error('UART: Failed to start USB service', error);
    }
  }

  async connect(): Promise<boolean> {
    console.log('UART: Connecting... (Mock mode:', this.useMockData, ')');

    try {
      if (this.useMockData) {
        console.log('UART: Mock mode enabled, will generate dummy data on fetch');
        this.isConnected = true;
        return true;
      }

      if (!RNSerialport || Platform.OS !== 'android') {
        console.warn('UART: USB Serial not available on this platform');
        return false;
      }

      if (!this.isServiceStarted) {
        console.log('UART: Waiting for USB service to start...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const devices = await this.listDevices();
      if (devices.length === 0) {
        console.warn('UART: No USB serial devices found');
        return false;
      }

      this.devicePath = devices[0].name;
      console.log('UART: Found device:', this.devicePath);

      await RNSerialport.open(this.devicePath, {
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 0,
        flowControl: 0,
      });
      console.log('UART: Connection request sent, waiting for ON_CONNECTED event...');

      await new Promise(resolve => setTimeout(resolve, 500));
      return this.isConnected;
    } catch (error) {
      console.error('UART connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isFetching = false;

    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }

    if (RNSerialport && this.devicePath && !this.useMockData) {
      try {
        await RNSerialport.disconnect();
        console.log('UART: Disconnected');
      } catch (error) {
        console.error('UART disconnect error:', error);
      }
    }

    this.isConnected = false;
    this.devicePath = null;
    this.dataBuffer = '';
  }

  async sendCommand(command: UARTCommand): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('UART not connected');
      return false;
    }

    try {
      const commandStr = JSON.stringify(command) + '\n';
      console.log('Sending UART command:', commandStr);

      if (command.Cmd === 'Send') {
        this.isFetching = true;
        console.log('UART: Fetch mode enabled, listeners count:', this.listeners.length);

        if (this.useMockData) {
          console.log('UART: Starting mock data generator');
          this.startMockData();
        } else if (RNSerialport && this.devicePath) {
          await RNSerialport.writeString(commandStr);
          console.log('UART: Command sent to USB device:', this.devicePath);
        }
      } else if (command.Cmd === 'Stop') {
        this.isFetching = false;
        console.log('UART: Fetch mode disabled');

        if (this.mockDataInterval) {
          clearInterval(this.mockDataInterval);
          this.mockDataInterval = null;
          console.log('UART: Mock data generator stopped');
        }

        if (RNSerialport && this.devicePath && !this.useMockData) {
          await RNSerialport.writeString(commandStr);
          console.log('UART: Stop command sent to USB device');
        }
      }

      return true;
    } catch (error) {
      console.error('UART send error:', error);
      return false;
    }
  }

  onDataReceived(callback: (data: UARTData) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(data: UARTData) {
    console.log('UART: Notifying listeners, count:', this.listeners.length, 'data:', data);
    this.listeners.forEach((callback) => callback(data));
  }

  private startMockData() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    if (!this.useMockData) {
      console.log('UART: Not in mock mode, not starting generator');
      return;
    }

    console.log('UART: Mock data generator started (Platform:', Platform.OS, ')');

    this.mockDataInterval = setInterval(() => {
      if (this.isFetching && this.useMockData) {
        const mockData: UARTData = {
          Freq: 1200 + Math.random() * 200,
          Temp: 25 + Math.random() * 5,
          Bat: 85 + Math.floor(Math.random() * 15),
        };
        console.log('UART: Generating mock data:', mockData);
        this.notifyListeners(mockData);
      }
    }, 2000);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getFetchingStatus(): boolean {
    return this.isFetching;
  }

  async setMockMode(enabled: boolean): Promise<void> {
    console.log('UART: Switching mock mode from', this.useMockData, 'to', enabled);

    await this.disconnect();
    this.useMockData = enabled;

    const connected = await this.connect();
    console.log('UART: Reconnected with mock mode', enabled, 'connected:', connected);
  }

  isMockMode(): boolean {
    return this.useMockData;
  }

  private async listDevices(): Promise<any[]> {
    if (!RNSerialport || Platform.OS !== 'android') {
      return [];
    }
    try {
      const devices = await RNSerialport.getDeviceList();
      console.log('UART: Available devices:', devices);
      return devices || [];
    } catch (error) {
      console.error('UART: Error listing devices:', error);
      return [];
    }
  }

  private handleSerialData(data: string): void {
    this.dataBuffer += data;

    const lines = this.dataBuffer.split('\n');
    this.dataBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        this.parseAndNotify(trimmed);
      }
    }
  }

  private parseAndNotify(line: string): void {
    try {
      const parsed = JSON.parse(line);

      if (parsed.Freq !== undefined && parsed.Temp !== undefined && parsed.Bat !== undefined) {
        const uartData: UARTData = {
          Freq: parsed.Freq,
          Temp: parsed.Temp,
          Bat: parsed.Bat,
        };
        console.log('UART: Parsed data:', uartData);
        this.notifyListeners(uartData);
      }
    } catch (error) {
      console.warn('UART: Failed to parse JSON:', line, error);
    }
  }

  cleanup() {
    if (this.serialSubscriptions.length > 0) {
      this.serialSubscriptions.forEach((sub) => sub.remove());
      this.serialSubscriptions = [];
    }

    if (RNSerialport && Platform.OS === 'android') {
      try {
        RNSerialport.stopUsbService();
      } catch (error) {
        console.error('UART: Error stopping USB service', error);
      }
    }
  }
}

export const uartService = new UARTService();
