import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wifi, WifiOff, Battery, Activity } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CalculationService } from '../../services/calculationService';
import { storageService } from '../../services/storageService';

export default function Dashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    currentSensor,
    currentReading,
    isConnected,
    isFetching,
    isOnline,
    sensors,
    lastReadingTime,
    isReceivingData,
    startFetching,
    stopFetching,
    setCurrentSensor,
    uploadReadings,
  } = useData();

  const [sensorModalVisible, setSensorModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await storageService.getSettings();
    setTemperatureUnit(settings.temperatureUnit);
  };

  const handleFetchToggle = async () => {
    if (isFetching) {
      await stopFetching();
    } else {
      if (!currentSensor) {
        Alert.alert('No Sensor Selected', 'Please select a sensor first.');
        return;
      }
      await startFetching();
    }
  };

  const handleSensorSelect = async (sensorId: string) => {
    const sensor = sensors.find((s) => s.sensor_id === sensorId);
    if (sensor) {
      await setCurrentSensor(sensor);
      setSensorModalVisible(false);
    }
  };

  const handlePush = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Please connect to Wi-Fi to upload data.');
      return;
    }

    try {
      await uploadReadings();
      Alert.alert('Success', 'Data uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload data.');
    }
  };

  const filteredSensors = sensors.filter((s) =>
    s.sensor_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const temperature = currentReading
    ? temperatureUnit === 'F'
      ? CalculationService.convertCelsiusToFahrenheit(currentReading.Temp)
      : currentReading.Temp
    : null;

  const finalLoad =
    currentReading && currentSensor
      ? CalculationService.calculateFinalLoad(
          currentReading.Freq,
          currentSensor.initial_reading,
          currentSensor.gauge_factor
        )
      : null;

  const digits = currentReading ? CalculationService.calculateDigits(currentReading.Freq) : null;

  const frequency = currentReading?.Freq ?? null;
  const battery = currentReading?.Bat ?? null;

  const connectionStatus = currentReading && currentReading.Freq > 0 ? 'Connected' : 'Disconnected';

  const getDataStatus = () => {
    if (!isFetching) return null;
    if (isReceivingData) return 'Receiving Data';
    return 'Waiting for Data...';
  };

  const getTimeSinceLastReading = () => {
    if (!lastReadingTime) return null;
    const seconds = Math.floor((Date.now() - lastReadingTime.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Readout Unit</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
          {isOnline ? <Wifi size={20} color="#10B981" /> : <WifiOff size={20} color="#EF4444" />}
        </View>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={[styles.sensorSelector, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setSensorModalVisible(true)}
        >
          <Text style={[styles.sensorLabel, { color: colors.textTertiary }]}>Selected Sensor</Text>
          <Text style={[styles.sensorValue, { color: colors.text }]}>
            {currentSensor?.sensor_id ?? 'Tap to select'}
          </Text>
          {currentSensor?.remark && (
            <Text style={[styles.sensorRemark, { color: colors.textTertiary }]}>{currentSensor.remark}</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.statusBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.statusItem}>
            <Activity size={20} color={connectionStatus === 'Connected' ? '#10B981' : '#EF4444'} />
            <Text style={[styles.statusText, { color: colors.textSecondary }, connectionStatus === 'Connected' ? styles.statusConnected : styles.statusDisconnected]}>
              {connectionStatus}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Battery size={20} color="#3B82F6" />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{battery !== null ? `${battery}%` : '-'}</Text>
          </View>
        </View>

        {isFetching && (
          <View style={[styles.dataStatusBar, { backgroundColor: isReceivingData ? '#ECFDF5' : '#FEF3C7', borderColor: isReceivingData ? '#10B981' : '#F59E0B' }]}>
            <View style={[styles.dataStatusDot, { backgroundColor: isReceivingData ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.dataStatusText, { color: isReceivingData ? '#047857' : '#B45309' }]}>
              {getDataStatus()}
            </Text>
            {lastReadingTime && (
              <Text style={[styles.dataStatusTime, { color: isReceivingData ? '#059669' : '#D97706' }]}>
                {getTimeSinceLastReading()}
              </Text>
            )}
          </View>
        )}

        <View style={styles.readingsGrid}>
          <View style={[styles.readingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.readingLabel, { color: colors.textTertiary }]}>Frequency</Text>
            <Text style={[styles.readingValue, { color: colors.text }]}>
              {frequency !== null ? CalculationService.formatNumber(frequency, 2) : '-'}
            </Text>
            <Text style={[styles.readingUnit, { color: colors.textTertiary }]}>Hz</Text>
          </View>

          <View style={[styles.readingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.readingLabel, { color: colors.textTertiary }]}>Temperature</Text>
            <Text style={[styles.readingValue, { color: colors.text }]}>
              {temperature !== null ? CalculationService.formatNumber(temperature, 1) : '-'}
            </Text>
            <Text style={[styles.readingUnit, { color: colors.textTertiary }]}>°{temperatureUnit}</Text>
          </View>

          <View style={[styles.readingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.readingLabel, { color: colors.textTertiary }]}>Digits</Text>
            <Text style={[styles.readingValue, { color: colors.text }]}>
              {digits !== null ? CalculationService.formatNumber(digits, 2) : '-'}
            </Text>
            <Text style={[styles.readingUnit, { color: colors.textTertiary }]}>μɛ</Text>
          </View>

          <View style={[styles.readingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.readingLabel, { color: colors.textTertiary }]}>Final Load</Text>
            <Text style={[styles.readingValue, { color: colors.text }]}>
              {finalLoad !== null ? CalculationService.formatNumber(finalLoad, 2) : '-'}
            </Text>
            <Text style={[styles.readingUnit, { color: colors.textTertiary }]}>kg</Text>
          </View>
        </View>

        <View style={[styles.calibrationInfo, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Initial Reading</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {CalculationService.formatNumber(currentSensor?.initial_reading ?? 0, 2)} Hz
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Gauge Factor</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {CalculationService.formatNumber(currentSensor?.gauge_factor ?? 0, 4)}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.primaryButton, isFetching && styles.primaryButtonActive]}
            onPress={handleFetchToggle}
          >
            <Text style={styles.primaryButtonText}>{isFetching ? 'Stop' : 'Fetch'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={handlePush}
            disabled={!isOnline}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }, !isOnline && styles.buttonTextDisabled]}>
              Push to Cloud
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/calibration')}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Add Sensor</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={sensorModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSensorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Sensor</Text>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Search sensor ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textTertiary}
            />

            <ScrollView style={styles.sensorList}>
              {filteredSensors.length > 0 ? (
                filteredSensors.map((sensor) => (
                  <TouchableOpacity
                    key={sensor.sensor_id}
                    style={[styles.sensorItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSensorSelect(sensor.sensor_id)}
                  >
                    <Text style={[styles.sensorItemId, { color: colors.text }]}>{sensor.sensor_id}</Text>
                    {sensor.remark && (
                      <Text style={[styles.sensorItemRemark, { color: colors.textTertiary }]}>{sensor.remark}</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.noSensorsText, { color: colors.textTertiary }]}>No sensors found</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSensorModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#EF4444',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sensorSelector: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sensorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sensorRemark: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusConnected: {
    color: '#10B981',
  },
  statusDisconnected: {
    color: '#EF4444',
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  readingCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  readingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  readingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  readingUnit: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  calibrationInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonActive: {
    backgroundColor: '#EF4444',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  dataStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  dataStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dataStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataStatusTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  sensorList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  sensorItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sensorItemId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sensorItemRemark: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  noSensorsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalCloseButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
