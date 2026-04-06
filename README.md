# Anime Image Downloader Flutter

Cross-platform image browser and downloader for cnmiw-compatible anime image APIs.

## Targets

- Android
- iOS
- Linux
- macOS
- Windows

## Features

- CDN-first default feed using `CDNrandom`
- Full category list from the cnmiw API
- Built-in Referer handling for protected categories
- Grid browsing and full-screen image viewer
- Save to gallery on Android
- Save to a configured default directory on desktop
- Configurable API base domain, including mirror support like `https://idnm.de`

## Development

### Nix

```bash
nix develop
flutter pub get
flutter run -d linux
```

### Without Nix

Install a recent Flutter SDK, Android toolchain, and Linux/Windows desktop build dependencies.

## Release artifacts

- Android APK
- iOS unsigned app zip
- Linux portable zip
- Linux AppImage installer
- macOS app zip
- Windows portable zip
- Windows installer exe

## Release notes

- `0.3.0`: initial Flutter cross-platform release with cnmiw-compatible browsing, saving, settings, flake dev shell, and GitHub Actions publishing.
- `0.3.1`: optimize gallery caching, add richer viewer controls and shortcuts, include image diagnostics in the info panel, and publish portable plus installer desktop artifacts.
- `0.4.0`: switch to the new project icon, reduce default cache limits for large curated images, and move iOS/macOS platform generation and publishing into GitHub Actions.

## API details

See `docs/API_USAGE.md`.
