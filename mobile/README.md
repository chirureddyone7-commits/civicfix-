# CivicFix mobile app (Expo Go)

This is a new Expo Router mobile client. It is isolated in `mobile/`; the existing backend and admin dashboard are unchanged.

## Run with Expo Go

1. Install Node.js LTS and the latest Expo Go app on your phone.
2. In a terminal, enter `mobile`.
3. Run `npm install`.
4. Set the backend URL before starting Expo:
   - Windows PowerShell: `$env:EXPO_PUBLIC_API_URL="http://YOUR-PC-LAN-IP:5000"`
   - Replace YOUR-PC-LAN-IP with the computer's Wi-Fi IPv4 address (for example, `192.168.1.8`).
5. Run `npx expo start --tunnel` and scan the QR code in Expo Go.

Keep the phone and computer online. The backend must already be running and reachable on port 5000. Do not use `localhost` for a physical Android phone; it points to the phone itself.

## Implemented screens

- Home with issue categories and recent reports
- Three-step report flow (details, local photo preview, GPS/manual location)
- Live report list with status filters
- Issue map preview and location/priority counts
- Profile and API connection guidance

## Backend contract used

- `GET /api/issues`
- `POST /api/issues` with title, description, category, location, latitude, longitude
- AI category/priority analysis is performed by the existing backend during submission.

The current backend schema does not accept image files. Photos are selected and previewed locally but are not uploaded. A real image upload requires a backend storage endpoint; this app intentionally does not modify backend files.
