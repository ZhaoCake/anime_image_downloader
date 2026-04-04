import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_settings.dart';
import '../../core/config/settings_controller.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  late final TextEditingController _baseUrlController;

  @override
  void initState() {
    super.initState();
    _baseUrlController = TextEditingController();
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(settingsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: settingsAsync.when(
        data: (settings) {
          _baseUrlController.text = settings.baseUrl;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextField(
                controller: _baseUrlController,
                decoration: const InputDecoration(
                  labelText: 'API 域名',
                  hintText: 'https://cnmiw.com',
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  ActionChip(
                    label: const Text('cnmiw.com'),
                    onPressed: () => _baseUrlController.text = 'https://cnmiw.com',
                  ),
                  ActionChip(
                    label: const Text('idnm.de'),
                    onPressed: () => _baseUrlController.text = 'https://idnm.de',
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  final normalized = _normalizeBaseUrl(_baseUrlController.text);
                  await ref
                      .read(settingsControllerProvider.notifier)
                      .updateBaseUrl(normalized);
                  if (!mounted) {
                    return;
                  }
                  messenger.showSnackBar(
                    const SnackBar(content: Text('域名已保存')),
                  );
                },
                child: const Text('保存域名'),
              ),
              const SizedBox(height: 24),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('默认保存目录'),
                subtitle: Text(settings.defaultDirectory ?? '未设置，保存时选择'),
              ),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  FilledButton.tonal(
                    onPressed: () => _pickDirectory(settings),
                    child: const Text('选择目录'),
                  ),
                  OutlinedButton(
                    onPressed: settings.defaultDirectory == null
                        ? null
                        : () async {
                            await ref
                                .read(settingsControllerProvider.notifier)
                                .updateDefaultDirectory(null);
                          },
                    child: const Text('清除目录'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('短期缓存图片数量'),
                subtitle: Text('当前保留上限：${settings.cacheItemLimit} 张'),
              ),
              Slider(
                min: 40,
                max: 240,
                divisions: 10,
                label: '${settings.cacheItemLimit}',
                value: settings.cacheItemLimit.toDouble(),
                onChanged: (value) async {
                  await ref
                      .read(settingsControllerProvider.notifier)
                      .updateCacheItemLimit(value.round());
                },
              ),
              const SizedBox(height: 8),
              const Text(
                '说明：非 CDN 分类会自动附加 Referer: https://weibo.com/，保存图片时也会沿用同样的请求策略。缓存上限越高，回滚列表时越不容易重新渲染，但会占用更多内存。',
              ),
            ],
          );
        },
        error: (error, _) => Center(child: Text('设置加载失败: $error')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }

  Future<void> _pickDirectory(AppSettings settings) async {
    final messenger = ScaffoldMessenger.of(context);
    final path = await getDirectoryPath(initialDirectory: settings.defaultDirectory);
    if (path == null) {
      return;
    }
    await ref.read(settingsControllerProvider.notifier).updateDefaultDirectory(path);
    if (!mounted) {
      return;
    }
    messenger.showSnackBar(
      const SnackBar(content: Text('默认目录已更新')),
    );
  }

  String _normalizeBaseUrl(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      return AppSettings.defaultBaseUrl;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replaceFirst(RegExp(r'/+$'), '');
    }
    return 'https://${trimmed.replaceFirst(RegExp(r'/+$'), '')}';
  }
}
