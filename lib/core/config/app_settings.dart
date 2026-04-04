class AppSettings {
  const AppSettings({
    required this.baseUrl,
    required this.defaultDirectory,
    required this.cacheItemLimit,
  });

  static const defaultBaseUrl = 'https://cnmiw.com';
  static const defaultCacheItemLimit = 120;

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
