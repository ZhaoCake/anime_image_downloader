import 'dart:io';

import 'package:file_selector/file_selector.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gal/gal.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/config/settings_controller.dart';
import '../../core/model/image_item.dart';
import '../../core/model/image_sort.dart';
import '../settings/settings_page.dart';
import 'gallery_controller.dart';

class GalleryPage extends ConsumerWidget {
  const GalleryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final galleryAsync = ref.watch(galleryControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Anime Image Downloader'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              final sort = ref.read(galleryControllerProvider).value?.selectedSort ??
                  ImageSort.cdnRandom;
              ref.read(galleryControllerProvider.notifier).refreshForSort(sort);
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const SettingsPage()),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _SortBar(
            selectedSort:
                galleryAsync.valueOrNull?.selectedSort ?? ImageSort.cdnRandom,
            onSelected: (sort) {
              ref.read(galleryControllerProvider.notifier).refreshForSort(sort);
            },
          ),
          Expanded(
            child: galleryAsync.when(
              data: (gallery) => _GalleryGrid(
                items: gallery.items,
                isLoadingMore: gallery.isLoadingMore,
                errorMessage: gallery.errorMessage,
                onLoadMore: () => ref.read(galleryControllerProvider.notifier).loadMore(),
                onOpen: (index) {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ImageViewerPage(items: gallery.items, initialIndex: index),
                    ),
                  );
                },
              ),
              error: (error, _) => Center(child: Text('加载失败: $error')),
              loading: () => const Center(child: CircularProgressIndicator()),
            ),
          ),
        ],
      ),
    );
  }
}

class _SortBar extends StatelessWidget {
  const _SortBar({
    required this.selectedSort,
    required this.onSelected,
  });

  final ImageSort selectedSort;
  final ValueChanged<ImageSort> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, index) {
          final sort = ImageSort.values[index];
          return ChoiceChip(
            label: Text(sort.label),
            selected: sort == selectedSort,
            onSelected: (_) => onSelected(sort),
          );
        },
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemCount: ImageSort.values.length,
      ),
    );
  }
}

class _GalleryGrid extends StatefulWidget {
  const _GalleryGrid({
    required this.items,
    required this.isLoadingMore,
    required this.errorMessage,
    required this.onLoadMore,
    required this.onOpen,
  });

  final List<ImageItem> items;
  final bool isLoadingMore;
  final String? errorMessage;
  final VoidCallback onLoadMore;
  final ValueChanged<int> onOpen;

  @override
  State<_GalleryGrid> createState() => _GalleryGridState();
}

class _GalleryGridState extends State<_GalleryGrid> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final crossAxisCount = MediaQuery.sizeOf(context).width >= 1100
        ? 5
        : MediaQuery.sizeOf(context).width >= 800
            ? 4
            : MediaQuery.sizeOf(context).width >= 600
                ? 3
                : 2;

    return CustomScrollView(
      controller: _scrollController,
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.all(12),
          sliver: SliverGrid.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.72,
            ),
            itemCount: widget.items.length,
            itemBuilder: (context, index) {
              final item = widget.items[index];
              return GestureDetector(
                onTap: () => widget.onOpen(index),
                child: Hero(
                  tag: item.id,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: ColoredBox(
                      color: const Color(0xFF131B34),
                      child: Image.network(
                        item.url,
                        headers: item.referer == null
                            ? null
                            : <String, String>{'Referer': item.referer!},
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => const Center(
                          child: Icon(Icons.broken_image_outlined),
                        ),
                        loadingBuilder: (context, child, event) {
                          if (event == null) {
                            return child;
                          }
                          return const Center(child: CircularProgressIndicator());
                        },
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            child: Column(
              children: [
                if (widget.errorMessage != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(widget.errorMessage!),
                  ),
                FilledButton.tonal(
                  onPressed: widget.isLoadingMore ? null : widget.onLoadMore,
                  child: widget.isLoadingMore
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('加载更多'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _onScroll() {
    if (!_scrollController.hasClients || widget.isLoadingMore) {
      return;
    }
    final position = _scrollController.position;
    if (position.maxScrollExtent - position.pixels < 480) {
      widget.onLoadMore();
    }
  }
}

class ImageViewerPage extends ConsumerStatefulWidget {
  const ImageViewerPage({
    super.key,
    required this.items,
    required this.initialIndex,
  });

  final List<ImageItem> items;
  final int initialIndex;

  @override
  ConsumerState<ImageViewerPage> createState() => _ImageViewerPageState();
}

class _ImageViewerPageState extends ConsumerState<ImageViewerPage> {
  late final PageController _pageController;
  late int _currentIndex;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.items[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text(current.sort.label),
        actions: [
          IconButton(
            onPressed: _isSaving ? null : () => _saveCurrent(current),
            icon: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.download),
          ),
        ],
      ),
      body: PageView.builder(
        controller: _pageController,
        itemCount: widget.items.length,
        onPageChanged: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        itemBuilder: (context, index) {
          final item = widget.items[index];
          return InteractiveViewer(
            minScale: 0.8,
            maxScale: 4,
            child: Center(
              child: Hero(
                tag: item.id,
                child: Image.network(
                  item.url,
                  headers:
                      item.referer == null ? null : <String, String>{'Referer': item.referer!},
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.broken_image_outlined, size: 64),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _saveCurrent(ImageItem item) async {
    setState(() {
      _isSaving = true;
    });

    try {
      final bytes = await ref.read(imageRepositoryProvider).download(item);
      final settings = await ref.read(settingsControllerProvider.future);
      final fileName = _buildFileName(item);

      if (!kIsWeb && Platform.isAndroid) {
        final tempDir = await getTemporaryDirectory();
        final file = File('${tempDir.path}/$fileName');
        await file.writeAsBytes(bytes, flush: true);
        await Gal.putImage(file.path, album: 'Anime Image Downloader');
      } else {
        final filePath = await _resolveDesktopTargetPath(settings.defaultDirectory, fileName);
        if (filePath == null) {
          return;
        }
        final file = File(filePath);
        await file.parent.create(recursive: true);
        await file.writeAsBytes(bytes, flush: true);
      }

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('图片已保存')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('保存失败: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  Future<String?> _resolveDesktopTargetPath(String? defaultDirectory, String fileName) async {
    if (kIsWeb || (!Platform.isWindows && !Platform.isLinux && !Platform.isMacOS)) {
      return null;
    }

    if (defaultDirectory != null && defaultDirectory.isNotEmpty) {
      return '$defaultDirectory/$fileName';
    }

    final path = await getSaveLocation(suggestedName: fileName);
    return path?.path;
  }

  String _buildFileName(ImageItem item) {
    final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
    final extensionMatch = RegExp(r'\.([A-Za-z0-9]+)(?:\?|$)').firstMatch(item.url);
    final extension = extensionMatch?.group(1) ?? 'jpg';
    final shortHash = item.url.hashCode.abs().toRadixString(16).padLeft(8, '0').substring(0, 8);
    return '${item.sort.apiValue}_${timestamp}_$shortHash.$extension';
  }
}
