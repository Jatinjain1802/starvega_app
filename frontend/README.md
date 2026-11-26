# Starvega PG mobile setup

React Native Community CLI, JavaScript/JSX, no Expo. The dependency manifest targets React Native 0.81.5 and React 19.1.0 as an initial compatibility baseline; dependency resolution and native builds have not been verified. Do not treat these versions as a production security baseline without review.

## Prerequisites
Node 22, JDK 17, Android Studio and the Android SDK required by the generated template. For iOS, use macOS, Xcode, Ruby/Bundler and CocoaPods.

## Generate native projects
From the repository root, create the matching template outside the frontend directory:

```sh
npx @react-native-community/cli@20.0.0 init StarvegaPG --version 0.81.5 --directory ../StarvegaPG-native --skip-install
```

Copy android/, ios/, Gemfile and any required native template support files from ../StarvegaPG-native into frontend/. Preserve this repository's App.jsx, index.js, app.json, src/, package.json, Babel and Metro configurations. Do not copy the template App.tsx. Inspect the generated app registration name and ensure it is StarvegaPG. Choose the final Android application ID and iOS bundle identifier before configuring Firebase or signing.

```sh
cd frontend
npm install
# macOS only:
bundle install
cd ios && bundle exec pod install && cd ..
```

Commit the generated native projects and verified lockfile after successful installation. If dependency installation or autolinking fails, resolve compatibility rather than using --force or --legacy-peer-deps.

## Native configuration checklist
- Android: INTERNET and POST_NOTIFICATIONS (Android 13+) permissions; camera permission only if required by the selected camera integration. Restrict development cleartext HTTP to debug builds; release uses HTTPS.
- iOS: NSCameraUsageDescription and NSPhotoLibraryUsageDescription where required; configure notification capability and APNs for push. Keep any development transport-security exception out of release.
- Firebase: register matching Android/iOS identifiers, install google-services.json and GoogleService-Info.plist in their native locations, configure the Google Services Gradle plugin and iOS Firebase initialization per the installed SDK. Never commit Firebase Admin private keys. Push service is not yet wired to the account lifecycle.
- Razorpay: use test-mode credentials from the backend, verify native checkout and server webhook confirmation; never embed a secret key.
- Keychain: verify secure storage, refresh, password change and logout on real devices.
- Camera/gallery/document picker: verify file URI handling, cancellation, MIME type, size and native permissions. PDF upload exists; native PDF viewing and file export remain pending.

## Run
Start PostgreSQL and the backend using the backend README and apply the schema and database constraints before testing allocations. The API default is http://10.0.2.2:3000/api/v1 for Android emulator; iOS simulator uses localhost, and physical devices need a reachable development server. Edit src/config/api.js for the local target; use HTTPS in production.

In frontend/, run npm start in one terminal and npm run android (or npm run ios on macOS) in another.

## Verification
Test all three roles, property isolation, room allocation, payment sandbox and webhook, mandatory expense receipts, complaints, announcements, notification inbox, and password change. Native Firebase setup, signed builds, PDF viewing, actual file export and full runtime testing remain outstanding.
