# Fetch Command Debugging Guide

## Quick Start - Testing on Android/iOS/Web

**Mock data now works on ALL platforms!**

### Steps to Test with Dummy Data:

1. Open the app on your device/emulator
2. Go to **Settings** tab
3. Ensure **"Mock Data Mode"** toggle is **ON** (enabled by default)
4. Go to **Calibration** tab and add a test sensor (e.g., "TEST-001")
5. Return to **Dashboard** tab
6. Select your test sensor
7. Press **"Fetch"** button
8. Watch dummy data update every 2 seconds!

**When ready for real hardware:** Disable "Mock Data Mode" in Settings.

## How the Fetch System Works

### Flow Overview
1. User presses "Fetch" button
2. `startFetching()` sends `{Cmd: 'Send'}` via UART
3. UART service sets `isFetching = true`
4. Data starts flowing (mock data when enabled, real UART with hardware)
5. Listeners receive data via `onDataReceived()` callback
6. UI updates with new readings

### Key Components

#### 1. UART Service (`services/uartService.ts`)
- Manages connection and data flow
- Maintains listener array
- Generates mock data on ALL platforms when mock mode enabled (every 2 seconds)
- Toggle via Settings: `uartService.setMockMode(true/false)`

#### 2. Data Context (`contexts/DataContext.tsx`)
- Registers as UART listener on mount
- Tracks `isFetching`, `isReceivingData`, `lastReadingTime`
- Saves readings locally and to Supabase

#### 3. Dashboard UI (`app/(tabs)/index.tsx`)
- Shows connection status
- Displays data reception indicator
- Shows time since last reading

## Monitoring the System

### Console Logs to Watch For

When you press "Fetch", you should see:

```
Starting fetch command...
Sending UART command: {"Cmd":"Send"}
UART: Fetch mode enabled, listeners count: 1
Fetch command sent successfully
```

Every 2 seconds (in mock mode), you should see:

```
UART: Generating mock data: {Freq: 1234.56, Temp: 27.3, Bat: 92}
UART: Notifying listeners, count: 1, data: {Freq: 1234.56, Temp: 27.3, Bat: 92}
Data received: {Freq: 1234.56, Temp: 27.3, Bat: 92}
```

### Visual Indicators

1. **Status Bar** - Shows "Connected" when data frequency > 0
2. **Data Status Banner** (when fetching):
   - Green background = "Receiving Data" (data is flowing)
   - Yellow background = "Waiting for Data..." (fetch active but no data yet)
   - Shows time since last reading

3. **Battery Indicator** - Shows current battery percentage

## Troubleshooting

### Problem: Fetch button pressed but no data appears on Android/iOS

**Check:**
1. Go to Settings and verify "Mock Data Mode" is enabled
2. Open console logs (use `npx react-native log-android` or `npx react-native log-ios`)
3. Verify listener count is 1 (not 0)
4. Check if `isFetching` is true

**Solution:**
- Enable "Mock Data Mode" in Settings
- If listener count is 0: DataContext may not have mounted properly
- Restart the app to reinitialize

### Problem: Data stops flowing after some time

**Check:**
1. Console for errors
2. Verify `isFetching` is still true
3. Check if listener was unregistered

**Solution:**
- Press "Stop" then "Fetch" again to reset
- Check network connectivity (for Supabase saving)

### Problem: "Waiting for Data..." shows for more than 5 seconds

**Check:**
1. Console will show warning after 5 seconds
2. Verify "Mock Data Mode" is enabled in Settings
3. Listener count should be > 0
4. Mock data generator should be running

**Solution:**
- Enable "Mock Data Mode" in Settings
- If using real hardware: Check UART hardware connection
- If in mock mode: This shouldn't happen - restart the app

## Testing Checklist

1. ✓ Press Fetch button
2. ✓ See "Waiting for Data..." banner appear
3. ✓ Within 2 seconds, banner turns green "Receiving Data"
4. ✓ Readings update (Frequency, Temperature, Battery)
5. ✓ "Time ago" updates as new data arrives
6. ✓ Press Stop button
7. ✓ Banner disappears
8. ✓ Readings freeze at last value

## Testing with Real Hardware

When ready to use actual UART hardware:

1. **Disable Mock Data Mode** in Settings
2. Connect your UART device via USB/Bluetooth
3. Check device permissions for serial communication
4. Implement real UART communication in `services/uartService.ts`
5. Replace mock data generator with actual hardware reading code
6. Data format must match: `{Freq: number, Temp: number, Bat: number}`

### Mock Mode vs Real Hardware

| Feature | Mock Mode (ON) | Real Hardware (OFF) |
|---------|---------------|-------------------|
| Data Source | Auto-generated dummy data | UART device |
| Platform | Works on all (Android/iOS/Web) | Requires native hardware |
| Frequency | Every 2 seconds | Device-dependent |
| Use Case | Testing UI/logic | Production use |
