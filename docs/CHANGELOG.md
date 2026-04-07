# Changelog

## 0.4.0

- replace project branding assets with `docs/assets/asuka.jpg`
- lower the default short-term cache limit to 24 images for large 3 MB average sources
- configure GitHub Actions to generate iOS and macOS platform folders on the runner and publish their build artifacts
- generate launcher icons per platform in CI so existing Android/Linux/Windows builds are not blocked by missing Apple directories

## 0.3.1

- optimize gallery scrolling stability with configurable short-term image caching
- add viewer keyboard shortcuts, hover controls, and an image info panel
- show image dimensions and cache hit diagnostics in the viewer info panel
- publish desktop portable archives and installer artifacts in GitHub Release

## 0.3.0

- initial cross-platform Flutter application for Android, Linux, and Windows
- support cnmiw-compatible API fetching with Referer-aware policies
- browse, preview, and save images with configurable API base domain and save directory
- add flake.nix development shell and GitHub Actions CI and release workflows
