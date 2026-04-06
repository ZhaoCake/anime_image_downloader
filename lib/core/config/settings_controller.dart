import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_settings.dart';
import '../storage/settings_store.dart';

final settingsStoreProvider = Provider<SettingsStore>((ref) {
  return SettingsStore();
});

final settingsControllerProvider =
    AsyncNotifierProvider<SettingsController, AppSettings>(SettingsController.new);

final cacheConfigurationProvider = Provider<CacheConfiguration>((ref) {
  final settings = ref.watch(settingsControllerProvider).value ??
      const AppSettings(
        baseUrl: AppSettings.defaultBaseUrl,
        defaultDirectory: null,
        cacheItemLimit: AppSettings.defaultCacheItemLimit,
      );
  return CacheConfiguration(itemLimit: settings.cacheItemLimit);
});

class CacheConfiguration {
  const CacheConfiguration({required this.itemLimit});

  final int itemLimit;

  int get memoryImageLimit => itemLimit;

  int get memoryBytesLimit => itemLimit * 4 * 1024 * 1024;
}

class SettingsController extends AsyncNotifier<AppSettings> {
  @override
  Future<AppSettings> build() async {
    final store = ref.read(settingsStoreProvider);
    return store.load();
  }

  Future<void> updateBaseUrl(String value) async {
    final current = state.value ??
        const AppSettings(
          baseUrl: AppSettings.defaultBaseUrl,
          defaultDirectory: null,
          cacheItemLimit: AppSettings.defaultCacheItemLimit,
        );
    final next = current.copyWith(baseUrl: value);
    state = AsyncData(next);
    await ref.read(settingsStoreProvider).save(next);
  }

  Future<void> updateDefaultDirectory(String? value) async {
    final current = state.value ??
        const AppSettings(
          baseUrl: AppSettings.defaultBaseUrl,
          defaultDirectory: null,
          cacheItemLimit: AppSettings.defaultCacheItemLimit,
        );
    final next = current.copyWith(
      defaultDirectory: value,
      clearDefaultDirectory: value == null,
    );
    state = AsyncData(next);
    await ref.read(settingsStoreProvider).save(next);
  }

  Future<void> updateCacheItemLimit(int value) async {
    final current = state.value ??
        const AppSettings(
          baseUrl: AppSettings.defaultBaseUrl,
          defaultDirectory: null,
          cacheItemLimit: AppSettings.defaultCacheItemLimit,
        );
    final next = current.copyWith(cacheItemLimit: value);
    state = AsyncData(next);
    await ref.read(settingsStoreProvider).save(next);
  }
}
