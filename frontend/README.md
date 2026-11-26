# Mobile application foundation
JavaScript and JSX only. React Native Community CLI, not Expo.
The native Android/iOS scaffold has not been generated yet. Generate it locally in a temporary directory with the Community CLI, then copy the generated native project and configuration into this directory without overwriting src.
Install @reduxjs/toolkit react-redux axios @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context in the generated project.
The API default targets the Android emulator. Use localhost for iOS simulator or a reachable development server for physical devices. Production requires HTTPS.
Authentication refresh, secure storage, native builds and integration testing are pending.
