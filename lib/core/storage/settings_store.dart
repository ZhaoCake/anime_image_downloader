import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_settings.dart';

class SettingsStore {
  static const _baseUrlKey = 'base_url';
  static const _defaultDirectoryKey = 'default_directory';

  Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    return AppSettings(
      baseUrl: prefs.getString(_baseUrlKey) ?? AppSettings.defaultBaseUrl,
      defaultDirectory: prefs.getString(_defaultDirectoryKey),
    );
  }

  Future<void> save(AppSettings settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, settings.baseUrl);
    if (settings.defaultDirectory == null || settings.defaultDirectory!.isEmpty) {
      await prefs.remove(_defaultDirectoryKey);
    } else {
      await prefs.setString(_defaultDirectoryKey, settings.defaultDirectory!);
    }
  }
}
