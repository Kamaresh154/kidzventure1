# Building APK for KidzVenture ERP

## Prerequisites
1. Node.js 18+
2. Java JDK 17+
3. Android Studio (with SDK)
4. Python 3.9+

## Steps

### 1. Install Capacitor
```bash
npm install
npm run cap:init
```

### 2. Add Android Platform
```bash
npm run cap:add:android
```

### 3. Copy Web Files
```bash
npm run build:mobile
```

### 4. Update API URL (important!)
Open `android/app/src/main/res/xml/network_security_config.xml` and ensure your server domain is allowed.

Also update the API base URL in `frontend/js/api.js` if your backend is on a different server.

### 5. Generate APK
```bash
npm run build:apk
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 6. (Optional) Generate Signed APK for Release
```bash
cd android
./gradlew bundleRelease
```

## Development Mode
For development, you can:
1. Run the Flask backend on your local machine
2. On your phone, open the web app in a browser

Or use ngrok to expose localhost:
```bash
ngrok http 5000
```
Update the API base URL and test on your phone.
