import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CalculationService } from '../../services/calculationService';

export default function Calibration() {
  const router = useRouter();
  const { colors } = useTheme();
  const { saveSensor } = useData();
  const { width } = useWindowDimensions();

  const [sensorId, setSensorId] = useState('');
  const [gaugeFactor, setGaugeFactor] = useState('');
  const [initialReading, setInitialReading] = useState('');
  const [temperature, setTemperature] = useState('');
  const [remark, setRemark] = useState('');
  const [digits, setDigits] = useState(0);

  useEffect(() => {
    if (initialReading && !isNaN(parseFloat(initialReading))) {
      const calculatedDigits = CalculationService.calculateDigits(parseFloat(initialReading));
      setDigits(calculatedDigits);
    } else {
      setDigits(0);
    }
  }, [initialReading]);

  const handleSave = async () => {
    if (!sensorId.trim()) {
      Alert.alert('Error', 'Please enter a sensor ID');
      return;
    }

    if (!gaugeFactor.trim() || isNaN(parseFloat(gaugeFactor))) {
      Alert.alert('Error', 'Please enter a valid gauge factor');
      return;
    }

    if (!initialReading.trim() || isNaN(parseFloat(initialReading))) {
      Alert.alert('Error', 'Please enter a valid initial reading');
      return;
    }

    if (!temperature.trim() || isNaN(parseFloat(temperature))) {
      Alert.alert('Error', 'Please enter a valid temperature');
      return;
    }

    try {
      await saveSensor({
        sensor_id: sensorId.trim(),
        gauge_factor: parseFloat(gaugeFactor),
        initial_reading: parseFloat(initialReading),
        remark: remark.trim(),
        calibration_timestamp: new Date().toISOString(),
      });

      setSensorId('');
      setGaugeFactor('');
      setInitialReading('');
      setTemperature('');
      setRemark('');
      Alert.alert('Success', 'Sensor added successfully!');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save sensor');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const isLargeScreen = width > 600;
  const numColumns = isLargeScreen ? 2 : 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Add New Sensor</Text>

        <View style={styles.form}>
          <View style={[styles.row, numColumns === 2 && styles.rowWrap]}>
            <View style={[styles.inputGroup, numColumns === 2 && styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Sensor ID *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Enter sensor ID"
                placeholderTextColor={colors.textTertiary}
                value={sensorId}
                onChangeText={setSensorId}
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.inputGroup, numColumns === 2 && styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Gauge Factor *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Enter gauge factor"
                placeholderTextColor={colors.textTertiary}
                value={gaugeFactor}
                onChangeText={setGaugeFactor}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={[styles.row, numColumns === 2 && styles.rowWrap]}>
            <View style={[styles.inputGroup, numColumns === 2 && styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Initial Reading (Hz) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Enter initial reading"
                placeholderTextColor={colors.textTertiary}
                value={initialReading}
                onChangeText={setInitialReading}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, numColumns === 2 && styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Temperature (°C) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="Enter temperature"
                placeholderTextColor={colors.textTertiary}
                value={temperature}
                onChangeText={setTemperature}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.calculatedGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Digits (Calculated)</Text>
            <View style={styles.calculatedValue}>
              <Text style={styles.calculatedText}>
                {CalculationService.formatNumber(digits, 2)}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Remarks</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Enter remarks (optional)"
              placeholderTextColor={colors.textTertiary}
              value={remark}
              onChangeText={setRemark}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.input }]} onPress={handleCancel}>
              <Text style={[styles.cancelButtonText, { color: colors.textTertiary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Sensor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  form: {
    gap: 20,
  },
  row: {
    gap: 20,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inputGroup: {
    gap: 8,
  },
  halfWidth: {
    flex: 1,
    minWidth: 280,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  calculatedGroup: {
    gap: 8,
  },
  calculatedValue: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  calculatedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
