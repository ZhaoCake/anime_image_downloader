class AppSettings {
  const AppSettings({
    required this.baseUrl,
    required this.defaultDirectory,
  });

  static const defaultBaseUrl = 'https://cnmiw.com';

  final String baseUrl;
  final String? defaultDirectory;

  AppSettings copyWith({
    String? baseUrl,
    String? defaultDirectory,
    bool clearDefaultDirectory = false,
  }) {
    return AppSettings(
      baseUrl: baseUrl ?? this.baseUrl,
      defaultDirectory: clearDefaultDirectory
          ? null
          : defaultDirectory ?? this.defaultDirectory,
    );
  }
}
