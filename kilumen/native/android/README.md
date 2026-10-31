# Kilumen Android store bits (dev/kilumen-store)

Not yet in the shipped AAB (0.2.108 was built before this branch). To wire into `kilumen_android/cap/android`:

1. Copy `KilumenBillingPlugin.java` to `app/src/main/java/net/paigegames/kilumen/` and register it in `MainActivity`:
   `registerPlugin(KilumenBillingPlugin.class);` before `super.onCreate(...)`.
2. `app/build.gradle` dependencies: `implementation "com.android.billingclient:billing:7.1.1"`
   and in `defaultConfig` (values from `admob.properties`, Google TEST ids by default):
   ```
   buildConfigField "String", "ADMOB_REWARDED_ID", "\"ca-app-pub-3940256099942544/5224354917\""
   buildConfigField "String", "ADMOB_INTERSTITIAL_ID", "\"ca-app-pub-3940256099942544/1033173712\""
   buildConfigField "boolean", "TEST_ADS", "true"
   ```
   (`buildFeatures { buildConfig true }`).
3. AdMob: `npm i @capacitor-community/admob` in `cap/`, `npx cap sync android`, and in `AndroidManifest.xml` `<application>`:
   `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-3940256099942544~3347511713"/>` (TEST app id; swap for the real one).
4. Bump versionCode to 3 and rebuild the AAB.

Not done on this branch: the box disk is out of inodes (node_modules for the AdMob plugin would not fit), and the
release AAB must not change without Gary.
