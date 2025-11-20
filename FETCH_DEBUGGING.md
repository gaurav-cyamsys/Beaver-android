# Fetch Command Debugging Guide

## How the Fetch System Works

### Flow Overview
1. User presses "Fetch" button
2. `startFetching()` sends `{Cmd: 'Send'}` via UART
3. UART service sets `isFetching = true`
4. Data starts flowing (mock data on web, real UART on device)
5. Listeners receive data via `onDataReceived()` callback
6. UI updates with new readings

### Key Components

#### 1. UART Service (`services/uartService.ts`)
- Manages connection and data flow
- Maintains listener array
- Generates mock data on web platform (every 2 seconds)

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

Every 2 seconds (on web), you should see:

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

### Problem: Fetch button pressed but no data appears

**Check:**
1. Open browser console and look for logs
2. Verify listener count is 1 (not 0)
3. Check if `isFetching` is true
4. On web: Mock data generator should run every 2 seconds

**Solution:**
- If listener count is 0: DataContext may not have mounted properly
- If no mock data on web: Check Platform.OS detection
- Refresh the app to reinitialize

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
2. Listener count should be > 0
3. Mock data generator should be running

**Solution:**
- On native: Check UART hardware connection
- On web: This shouldn't happen (mock data is automatic)

## Testing Checklist

1. ✓ Press Fetch button
2. ✓ See "Waiting for Data..." banner appear
3. ✓ Within 2 seconds, banner turns green "Receiving Data"
4. ✓ Readings update (Frequency, Temperature, Battery)
5. ✓ "Time ago" updates as new data arrives
6. ✓ Press Stop button
7. ✓ Banner disappears
8. ✓ Readings freeze at last value

## For Native Device Testing

When testing on actual hardware:

1. Ensure UART device is connected
2. Check device permissions for serial communication
3. Mock data is only available on web platform
4. Real UART implementation needs to replace mock generator
5. Data format must match: `{Freq: number, Temp: number, Bat: number}`
