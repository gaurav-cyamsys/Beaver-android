import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storageService, AppSettings } from '../../services/storageService';
import { useTheme } from '../../contexts/ThemeContext';
import { uartService } from '../../services/uartService';

export default function Settings() {
  const { colors, theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({
    autoUpload: false,
    temperatureUnit: 'C',
    theme: 'light',
    brightness: 80,
  });
  const [mockMode, setMockMode] = useState(true);

  useEffect(() => {
    loadSettings();
    setMockMode(uartService.isMockMode());
  }, []);

  useEffect(() => {
    setSettings(prev => ({ ...prev, theme }));
  }, [theme]);

  const loadSettings = async () => {
    const loadedSettings = await storageService.getSettings();
    setSettings(loadedSettings);
  };

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await storageService.saveSettings(newSettings);

    if (key === 'theme') {
      await toggleTheme();
    }
  };

  const handleFactoryReset = () => {
    Alert.alert(
      'Factory Reset',
      'This will delete all sensor data and reset settings. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAll();
            Alert.alert('Success', 'Factory reset completed');
            loadSettings();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hardware</Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.input }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Mock Data Mode</Text>
              <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                Generate dummy data for testing (disable when using real hardware)
              </Text>
            </View>
            <Switch
              value={mockMode}
              onValueChange={(value) => {
                setMockMode(value);
                uartService.setMockMode(value);
                Alert.alert(
                  'Mock Mode ' + (value ? 'Enabled' : 'Disabled'),
                  value
                    ? 'App will generate dummy data every 2 seconds when you press Fetch'
                    : 'App will now use real UART hardware. Reconnect required.'
                );
              }}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={mockMode ? '#3B82F6' : '#F3F4F6'}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Sync</Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.input }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Auto Upload to Cloud</Text>
              <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                Upload data automatically when Wi-Fi is available
              </Text>
            </View>
            <Switch
              value={settings.autoUpload}
              onValueChange={(value) => updateSetting('autoUpload', value)}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={settings.autoUpload ? '#3B82F6' : '#F3F4F6'}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Display Preferences</Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.input }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Temperature Unit</Text>
            </View>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.input, borderColor: colors.inputBorder },
                  settings.temperatureUnit === 'C' && styles.toggleButtonActive,
                ]}
                onPress={() => updateSetting('temperatureUnit', 'C')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: colors.textTertiary },
                    settings.temperatureUnit === 'C' && styles.toggleButtonTextActive,
                  ]}
                >
                  °C
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.input, borderColor: colors.inputBorder },
                  settings.temperatureUnit === 'F' && styles.toggleButtonActive,
                ]}
                onPress={() => updateSetting('temperatureUnit', 'F')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: colors.textTertiary },
                    settings.temperatureUnit === 'F' && styles.toggleButtonTextActive,
                  ]}
                >
                  °F
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.input }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Theme</Text>
            </View>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.input, borderColor: colors.inputBorder },
                  settings.theme === 'light' && styles.toggleButtonActive,
                ]}
                onPress={() => updateSetting('theme', 'light')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: colors.textTertiary },
                    settings.theme === 'light' && styles.toggleButtonTextActive,
                  ]}
                >
                  Light
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: colors.input, borderColor: colors.inputBorder },
                  settings.theme === 'dark' && styles.toggleButtonActive,
                ]}
                onPress={() => updateSetting('theme', 'dark')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    { color: colors.textTertiary },
                    settings.theme === 'dark' && styles.toggleButtonTextActive,
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

          <View style={[styles.infoRow, { borderBottomColor: colors.input }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Version</Text>
            <Text style={[styles.infoValue, { color: colors.textTertiary }]}>1.0.0</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.input }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Build Date</Text>
            <Text style={[styles.infoValue, { color: colors.textTertiary }]}>2025-11-10</Text>
          </View>
        </View>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleFactoryReset}>
            <Text style={styles.dangerButtonText}>Factory Reset</Text>
          </TouchableOpacity>
          <Text style={[styles.dangerWarning, { color: colors.textTertiary }]}>
            This will delete all sensor data and reset settings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
  },
  dangerSection: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dangerWarning: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
