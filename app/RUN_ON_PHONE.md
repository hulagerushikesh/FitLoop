# Running FitLoop on your phone + shipping to the stores

## A. Test on your phone right now (Expo Go — the `flutter run` equivalent)

Fastest loop, live-reloads as you edit. **Everything works except remote push
notifications** (those need a dev build — see section B).

1. Install **Expo Go** on your phone (App Store / Play Store).
2. Put your phone on the **same Wi‑Fi** as this Mac.
3. Start the dev server:
   ```bash
   cd app
   npx expo start          # a QR code appears in the terminal
   ```
4. **iPhone:** open the Camera app, point at the QR → tap the Expo Go banner.
   **Android:** open Expo Go → *Scan QR code*.
   Or in Expo Go tap *Enter URL manually* and type: `exp://<your-mac-LAN-ip>:8081`
   (right now that is `exp://192.168.1.9:8081`).

> Not on the same Wi‑Fi? Use a tunnel: `npx expo start --tunnel`.

## B. Development build (full native features incl. push, still hot-reloads)

Needed to test **remote push notifications**, and a good pre-store check.

```bash
npm i -g eas-cli
eas login                 # free Expo account
eas init                  # creates the EAS projectId (push.ts reads it automatically)
eas build --profile development --platform android   # or ios
```
Install the resulting build on your device, then `npx expo start --dev-client`.

## C. Ship to the App Store & Play Store

Requires paid developer accounts:
- **Apple Developer Program** — $99/year (App Store)
- **Google Play Console** — $25 one-time (Play Store)

```bash
# Production builds (cloud-signed by EAS)
eas build --profile production --platform android    # -> .aab for Play Store
eas build --profile production --platform ios        # -> .ipa for App Store

# Submit
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

Before submitting, also do in the respective consoles:
- App name, description, screenshots (phone + tablet), category, privacy policy
  URL (the app already has an in-app Privacy screen — you'll also need a public
  URL; a simple hosted page pointing to the same text works).
- Google Play **Data safety** form + Apple **App Privacy** questionnaire — this
  app stores health/fitness data, so declare it (stored in your Supabase
  account, not sold, deletable in-app).
- Activate server push: after `eas init`, run `supabase db push` (applies the
  0009/0010 push migrations) and `supabase functions deploy daily-reminders`.

## Notes
- Bundle IDs are already set: iOS `com.rushikeshhulage.fitloop`,
  Android `com.rushikeshhulage.fitloop`.
- Camera + photo permission strings are configured in `app.json`.
- Local Node is v20.12.2 (Expo wants ≥20.19.4). EAS builds in the cloud with a
  correct Node, so builds are unaffected, but updating local Node removes the
  CLI warnings.
