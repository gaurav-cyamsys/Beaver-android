# Quick Testing Guide for Android

## Testing with Dummy Data on Android

Your app is now configured to generate fake UART data on Android for testing!

### Steps to Test:

1. **Run the app on Android:**
   ```bash
   npm run android
   # or
   npx expo run:android
   ```

2. **View console logs:**
   ```bash
   npx react-native log-android
   ```

3. **In the app:**
   - Open **Settings** tab
   - Verify **"Mock Data Mode"** is **ON** (it's enabled by default)
   - Go to **Calibration** tab
   - Add a test sensor (e.g., ID: "TEST-001", any values for gauge factor and initial reading)
   - Go back to **Dashboard**
   - Tap on "Selected Sensor" and choose your test sensor
   - Press **"Fetch"** button

4. **Watch the magic:**
   - Button turns red and says "Stop"
   - Yellow banner appears: "Waiting for Data..."
   - Within 2 seconds, banner turns green: "Receiving Data"
   - All readings update every 2 seconds:
     - Frequency (1200-1400 Hz)
     - Temperature (25-30°C)
     - Battery (85-100%)
     - Digits and Final Load (calculated)

5. **Check logs:**
   ```
   UART: Connecting... (Mock mode: true)
   Starting fetch command...
   UART: Fetch mode enabled, listeners count: 1
   UART: Generating mock data: {Freq: 1234.56, Temp: 27.3, Bat: 92}
   Data received: {Freq: 1234.56, Temp: 27.3, Bat: 92}
   ```

### Toggle Mock Mode

**To disable mock data (for real hardware):**
- Go to Settings → Turn OFF "Mock Data Mode"
- Reconnect required

**To enable mock data (for testing):**
- Go to Settings → Turn ON "Mock Data Mode"

### What You Should See

✅ Green "Receiving Data" banner with timestamp
✅ Connection status: "Connected"
✅ Live updating readings
✅ Battery percentage in status bar
✅ Time indicator showing seconds since last reading

### Troubleshooting

**No data appearing?**
- Check Settings → "Mock Data Mode" is ON
- View logs: `npx react-native log-android`
- Restart the app

**Data stops after some time?**
- Press "Stop" then "Fetch" again
- Check console for errors

## Files Modified

1. **`services/uartService.ts`**
   - Added `useMockData` flag (default: true)
   - Mock data now works on ALL platforms (web, Android, iOS)
   - Added `setMockMode()` and `isMockMode()` methods

2. **`app/(tabs)/settings.tsx`**
   - Added "Mock Data Mode" toggle
   - Located in "Hardware" section

3. **`contexts/DataContext.tsx`**
   - Added `lastReadingTime` and `isReceivingData` tracking
   - Enhanced logging for debugging

4. **`app/(tabs)/index.tsx`**
   - Added visual data status indicator
   - Shows "Receiving Data" or "Waiting for Data..."
   - Displays time since last reading

## Next Steps

Once your app works with mock data, you can:
1. Disable mock mode in Settings
2. Implement real UART communication in `services/uartService.ts`
3. Replace the mock data generator with actual hardware reads
4. Test with real hardware!
