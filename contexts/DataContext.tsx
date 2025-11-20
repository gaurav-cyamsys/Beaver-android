import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { storageService } from '../services/storageService';
import { uartService } from '../services/uartService';
import type { UARTData } from '../types/database';
import { CalculationService } from '../services/calculationService';

interface LocalSensor {
  sensor_id: string;
  gauge_factor: number;
  initial_reading: number;
  remark: string;
  calibration_timestamp: string;
}

interface LocalReading {
  sensor_id: string;
  frequency: number;
  temperature: number;
  final_load: number;
  digits: number;
  battery: number;
  timestamp: string;
}

interface DataContextType {
  currentSensor: LocalSensor | null;
  currentReading: UARTData | null;
  isConnected: boolean;
  isFetching: boolean;
  isOnline: boolean;
  sensors: LocalSensor[];
  lastReadingTime: Date | null;
  isReceivingData: boolean;
  setCurrentSensor: (sensor: LocalSensor | null) => Promise<void>;
  startFetching: () => Promise<void>;
  stopFetching: () => Promise<void>;
  loadSensors: () => Promise<void>;
  saveSensor: (sensor: LocalSensor) => Promise<void>;
  uploadReadings: () => Promise<void>;
  saveReading: (reading: UARTData) => Promise<void>;
  clearAllData: () => void;
  updateConnectionStatus: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SENSORS: '@sensors',
  READINGS: '@readings',
  CURRENT_SENSOR: '@current_sensor',
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [currentSensor, setCurrentSensorState] = useState<LocalSensor | null>(null);
  const [currentReading, setCurrentReading] = useState<UARTData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [sensors, setSensors] = useState<LocalSensor[]>([]);
  const [lastReadingTime, setLastReadingTime] = useState<Date | null>(null);
  const [isReceivingData, setIsReceivingData] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initUART = async () => {
      const connected = await uartService.connect();
      setIsConnected(connected);
    };

    initUART();

    const unsubscribe = uartService.onDataReceived((data) => {
      setCurrentReading(data);
      setLastReadingTime(new Date());
      setIsReceivingData(true);
      console.log('Data received:', data);
      saveReading(data);
    });

    return () => {
      unsubscribe();
      uartService.disconnect();
    };
  }, []);

  useEffect(() => {
    loadSensors();
  }, []);

  const setCurrentSensor = async (sensor: LocalSensor | null) => {
    setCurrentSensorState(sensor);
    if (sensor) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SENSOR, JSON.stringify(sensor));
    }
  };

  const startFetching = async () => {
    console.log('Starting fetch command...');
    const success = await uartService.sendCommand({ Cmd: 'Send' });
    if (success) {
      setIsFetching(true);
      setIsReceivingData(false);
      console.log('Fetch command sent successfully');
    } else {
      console.error('Failed to send fetch command');
    }
  };

  const stopFetching = async () => {
    console.log('Stopping fetch command...');
    const success = await uartService.sendCommand({ Cmd: 'Stop' });
    if (success) {
      setIsFetching(false);
      setIsReceivingData(false);
      console.log('Fetch stopped successfully');
    } else {
      console.error('Failed to stop fetch');
    }
  };

  const loadSensors = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SENSORS);
      if (data) {
        const loadedSensors: LocalSensor[] = JSON.parse(data);
        setSensors(loadedSensors);

        const currentSensorData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SENSOR);
        if (currentSensorData) {
          const current: LocalSensor = JSON.parse(currentSensorData);
          const sensor = loadedSensors.find((s) => s.sensor_id === current.sensor_id);
          if (sensor) {
            setCurrentSensorState(sensor);
          }
        }
      }
    } catch (error) {
      console.error('Error loading sensors:', error);
    }
  };

  const saveSensor = async (sensorData: LocalSensor) => {
    try {
      const existingSensors = await AsyncStorage.getItem(STORAGE_KEYS.SENSORS);
      let sensorsList: LocalSensor[] = existingSensors ? JSON.parse(existingSensors) : [];

      const existingIndex = sensorsList.findIndex((s) => s.sensor_id === sensorData.sensor_id);
      if (existingIndex >= 0) {
        sensorsList[existingIndex] = sensorData;
      } else {
        sensorsList.push(sensorData);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.SENSORS, JSON.stringify(sensorsList));
      await loadSensors();
      await setCurrentSensor(sensorData);
    } catch (error) {
      console.error('Error saving sensor:', error);
    }
  };

  const saveReading = async (uartData: UARTData) => {
    if (!currentSensor) return;

    const finalLoad = CalculationService.calculateFinalLoad(
      uartData.Freq,
      currentSensor.initial_reading,
      currentSensor.gauge_factor
    );

    const digits = CalculationService.calculateDigits(uartData.Freq);

    const reading: LocalReading = {
      sensor_id: currentSensor.sensor_id,
      frequency: uartData.Freq,
      temperature: uartData.Temp,
      final_load: finalLoad,
      digits: digits,
      battery: uartData.Bat,
      timestamp: new Date().toISOString(),
    };

    try {
      const existingReadings = await AsyncStorage.getItem(STORAGE_KEYS.READINGS);
      let readingsList: LocalReading[] = existingReadings ? JSON.parse(existingReadings) : [];
      readingsList.push(reading);

      await AsyncStorage.setItem(STORAGE_KEYS.READINGS, JSON.stringify(readingsList));

      if (isOnline) {
        await supabase.from('readings').insert({
          sensor_id: reading.sensor_id,
          device_id: null,
          frequency: reading.frequency,
          temperature: reading.temperature,
          final_load: reading.final_load,
          digits: reading.digits,
          battery: reading.battery,
          timestamp: reading.timestamp,
        });
      }
    } catch (error) {
      console.error('Error saving reading:', error);
    }
  };

  const uploadReadings = async () => {
    if (!isOnline) return;

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.READINGS);
      if (data) {
        const readings: LocalReading[] = JSON.parse(data);

        if (readings.length > 0) {
          const readingsToUpload = readings.map((r) => ({
            sensor_id: r.sensor_id,
            device_id: null,
            frequency: r.frequency,
            temperature: r.temperature,
            final_load: r.final_load,
            digits: r.digits,
            battery: r.battery,
            timestamp: r.timestamp,
          }));

          const { error } = await supabase.from('readings').insert(readingsToUpload);

          if (!error) {
            await AsyncStorage.setItem(STORAGE_KEYS.READINGS, JSON.stringify([]));
          }
        }
      }
    } catch (error) {
      console.error('Error uploading readings:', error);
    }
  };

  const clearAllData = () => {
    console.log('Clearing all data from context state');
    setSensors([]);
    setCurrentSensorState(null);
    setCurrentReading(null);
    setLastReadingTime(null);
    setIsReceivingData(false);
  };

  const updateConnectionStatus = () => {
    const connected = uartService.getConnectionStatus();
    console.log('DataContext: Updating connection status to', connected);
    setIsConnected(connected);
  };

  useEffect(() => {
    if (!isFetching) {
      setIsReceivingData(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (isFetching && !isReceivingData) {
        console.warn('Fetch command active but no data received after 5 seconds');
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isFetching, isReceivingData]);

  return (
    <DataContext.Provider
      value={{
        currentSensor,
        currentReading,
        isConnected,
        isFetching,
        isOnline,
        sensors,
        lastReadingTime,
        isReceivingData,
        setCurrentSensor,
        startFetching,
        stopFetching,
        loadSensors,
        saveSensor,
        uploadReadings,
        saveReading,
        clearAllData,
        updateConnectionStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
