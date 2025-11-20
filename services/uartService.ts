import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import type { UARTData, UARTCommand } from '../types/database';

const { RNSerialport } = NativeModules;
const serialportEmitter = RNSerialport ? new NativeEventEmitter(RNSerialport) : null;

class UARTService {
  private isConnected: boolean = false;
  private isFetching: boolean = false;
  private listeners: Array<(data: UARTData) => void> = [];
  private mockDataInterval: ReturnType<typeof setInterval> | null = null;
  private useMockData: boolean = true;
  private devicePath: string | null = null;
  private serialSubscriptions: any[] = [];
  private dataBuffer: string = '';

  async connect(): Promise<boolean> {
    console.log('UART: Connecting... (Mock mode:', this.useMockData, ')');

    try {
      // If mock mode is enabled, just mark as connected (mock data starts on fetch)
      if (this.useMockData) {
        console.log('UART: Mock mode enabled, will generate dummy data on fetch');
        this.isConnected = true;
        return true;
      }

      // Real USB serial connection
      if (!RNSerialport) {
        console.warn('UART: USB Serial not available on this platform');
        return false;
      }

      const devices = await this.listDevices();
      if (devices.length === 0) {
        console.warn('UART: No USB serial devices found');
        return false;
      }

      this.devicePath = devices[0].path;
      console.log('UART: Found device:', this.devicePath);

      await RNSerialport.open(this.devicePath, {
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 0,
        flowControl: 0,
      });

      this.isConnected = true;
      this.setupSerialListeners();
      console.log('UART: Connected to USB serial successfully');

      return true;
    } catch (error) {
      console.error('UART connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.isFetching = false;

    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }

    this.serialSubscriptions.forEach((sub) => sub.remove());
    this.serialSubscriptions = [];

    if (RNSerialport && this.devicePath) {
      try {
        await RNSerialport.close();
        console.log('UART: Disconnected');
      } catch (error) {
        console.error('UART disconnect error:', error);
      }
    }

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

        // Start mock data generator ONLY if in mock mode
        if (this.useMockData) {
          console.log('UART: Starting mock data generator');
          this.startMockData();
        } else if (RNSerialport && this.devicePath) {
          // Send real command to USB device
          await RNSerialport.writeString(commandStr);
          console.log('UART: Command sent to USB device');
        }
      } else if (command.Cmd === 'Stop') {
        this.isFetching = false;
        console.log('UART: Fetch mode disabled');

        // Stop mock data generator if running
        if (this.mockDataInterval) {
          clearInterval(this.mockDataInterval);
          this.mockDataInterval = null;
          console.log('UART: Mock data generator stopped');
        }

        // Send stop command to real device if connected
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
    // Clear any existing interval first
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    // Only start if in mock mode
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

    // Always disconnect first (using old mode state)
    await this.disconnect();

    // Now update the mode
    this.useMockData = enabled;

    // Always reconnect with new mode
    const connected = await this.connect();
    console.log('UART: Reconnected with mock mode', enabled, 'connected:', connected);
  }

  isMockMode(): boolean {
    return this.useMockData;
  }

  private async listDevices(): Promise<any[]> {
    if (!RNSerialport) {
      return [];
    }
    try {
      const devices = await RNSerialport.list();
      console.log('UART: Available devices:', devices);
      return devices;
    } catch (error) {
      console.error('UART: Error listing devices:', error);
      return [];
    }
  }

  private setupSerialListeners(): void {
    if (!serialportEmitter) {
      return;
    }

    const dataSubscription = serialportEmitter.addListener(
      'usbSerialportData',
      (data: { payload: string }) => {
        this.handleSerialData(data.payload);
      }
    );

    const errorSubscription = serialportEmitter.addListener(
      'usbSerialportError',
      (error: any) => {
        console.error('UART: Serial port error:', error);
      }
    );

    this.serialSubscriptions.push(dataSubscription, errorSubscription);
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
}

export const uartService = new UARTService();
