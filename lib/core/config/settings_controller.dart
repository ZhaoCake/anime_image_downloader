import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_settings.dart';
import '../storage/settings_store.dart';

final settingsStoreProvider = Provider<SettingsStore>((ref) {
  return SettingsStore();
});

final settingsControllerProvider =
    AsyncNotifierProvider<SettingsController, AppSettings>(SettingsController.new);

class SettingsController extends AsyncNotifier<AppSettings> {
  @override
  Future<AppSettings> build() async {
    final store = ref.read(settingsStoreProvider);
    return store.load();
  }

  Future<void> updateBaseUrl(String value) async {
    final current = state.value ??
        const AppSettings(baseUrl: AppSettings.defaultBaseUrl, defaultDirectory: null);
    final next = current.copyWith(baseUrl: value);
    state = AsyncData(next);
    await ref.read(settingsStoreProvider).save(next);
  }

  Future<void> updateDefaultDirectory(String? value) async {
    final current = state.value ??
        const AppSettings(baseUrl: AppSettings.defaultBaseUrl, defaultDirectory: null);
    final next = current.copyWith(
      defaultDirectory: value,
      clearDefaultDirectory: value == null,
    );
    state = AsyncData(next);
    await ref.read(settingsStoreProvider).save(next);
  }
}
