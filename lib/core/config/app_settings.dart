class AppSettings {
  const AppSettings({
    required this.baseUrl,
    required this.defaultDirectory,
    required this.cacheItemLimit,
  });

  static const defaultBaseUrl = 'https://cnmiw.com';
  // Average source images are around 3 MB, so 24 cached items stays near
  // 72 MB on disk while keeping a short scroll-back window responsive.
  static const defaultCacheItemLimit = 24;

  final String baseUrl;
  final String? defaultDirectory;
  final int cacheItemLimit;

  AppSettings copyWith({
    String? baseUrl,
    String? defaultDirectory,
    int? cacheItemLimit,
    bool clearDefaultDirectory = false,
  }) {
    return AppSettings(
      baseUrl: baseUrl ?? this.baseUrl,
      defaultDirectory: clearDefaultDirectory
          ? null
          : defaultDirectory ?? this.defaultDirectory,
      cacheItemLimit: cacheItemLimit ?? this.cacheItemLimit,
    );
  }
}
