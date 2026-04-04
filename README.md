# Anime Image Downloader Flutter

Cross-platform image browser and downloader for cnmiw-compatible anime image APIs.

## Targets

- Android
- Linux
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
- Linux portable zip
- Linux AppImage installer
- Windows portable zip
- Windows installer exe

## Release notes

- `0.3.0`: initial Flutter cross-platform release with cnmiw-compatible browsing, saving, settings, flake dev shell, and GitHub Actions publishing.
- `0.3.1`: optimize gallery caching, add richer viewer controls and shortcuts, include image diagnostics in the info panel, and publish portable plus installer desktop artifacts.

## API details

See `docs/API_USAGE.md`.
