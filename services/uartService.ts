import { Platform } from 'react-native';
import type { UARTData, UARTCommand } from '../types/database';

class UARTService {
  private isConnected: boolean = false;
  private isFetching: boolean = false;
  private listeners: Array<(data: UARTData) => void> = [];

  async connect(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.warn('UART not available on web platform');
      this.startMockData();
      return true;
    }

    try {
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('UART connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.isFetching = false;
  }

  async sendCommand(command: UARTCommand): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('UART not connected');
      return false;
    }

    try {
      const commandStr = JSON.stringify(command);
      console.log('Sending UART command:', commandStr);

      if (command.Cmd === 'Send') {
        this.isFetching = true;
        console.log('UART: Fetch mode enabled, listeners count:', this.listeners.length);
      } else if (command.Cmd === 'Stop') {
        this.isFetching = false;
        console.log('UART: Fetch mode disabled');
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
    if (Platform.OS !== 'web') return;

    console.log('UART: Starting mock data generator for web platform');
    setInterval(() => {
      if (this.isFetching) {
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
}

export const uartService = new UARTService();
