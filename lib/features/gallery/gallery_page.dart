import 'dart:async';
import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gal/gal.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/config/settings_controller.dart';
import '../../core/model/image_item.dart';
import '../../core/model/image_sort.dart';
import '../settings/settings_page.dart';
import 'gallery_controller.dart';

final galleryCacheManagerProvider = Provider<CacheManager>((ref) {
  final config = ref.watch(cacheConfigurationProvider);
  return CacheManager(
    Config(
      'gallery-image-cache',
      stalePeriod: const Duration(hours: 6),
      maxNrOfCacheObjects: config.itemLimit,
    ),
  );
});

class GalleryPage extends ConsumerStatefulWidget {
  const GalleryPage({super.key});

  @override
  ConsumerState<GalleryPage> createState() => _GalleryPageState();
}

class _GalleryPageState extends ConsumerState<GalleryPage> {
  final FocusNode _focusNode = FocusNode(debugLabel: 'gallery-shortcuts');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNode.requestFocus();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final config = ref.read(cacheConfigurationProvider);
    PaintingBinding.instance.imageCache.maximumSize = config.memoryImageLimit;
    PaintingBinding.instance.imageCache.maximumSizeBytes = config.memoryBytesLimit;
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final galleryAsync = ref.watch(galleryControllerProvider);

    return Focus(
      focusNode: _focusNode,
      autofocus: true,
      onKeyEvent: _handleKeyEvent,
      child: Scaffold(
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
                  cacheManager: ref.watch(galleryCacheManagerProvider),
                  items: gallery.items,
                  isLoadingMore: gallery.isLoadingMore,
                  errorMessage: gallery.errorMessage,
                  onLoadMore: () => ref.read(galleryControllerProvider.notifier).loadMore(),
                  onOpen: (index) {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => ImageViewerPage(
                          items: gallery.items,
                          initialIndex: index,
                          cacheManager: ref.read(galleryCacheManagerProvider),
                        ),
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
      ),
    );
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent || !HardwareKeyboard.instance.isAltPressed) {
      return KeyEventResult.ignored;
    }

    final selected = switch (event.logicalKey) {
      LogicalKeyboardKey.digit1 || LogicalKeyboardKey.numpad1 => ImageSort.values[0],
      LogicalKeyboardKey.digit2 || LogicalKeyboardKey.numpad2 => ImageSort.values[1],
      LogicalKeyboardKey.digit3 || LogicalKeyboardKey.numpad3 => ImageSort.values[2],
      LogicalKeyboardKey.digit4 || LogicalKeyboardKey.numpad4 => ImageSort.values[3],
      LogicalKeyboardKey.digit5 || LogicalKeyboardKey.numpad5 => ImageSort.values[4],
      LogicalKeyboardKey.digit6 || LogicalKeyboardKey.numpad6 => ImageSort.values[5],
      LogicalKeyboardKey.digit7 || LogicalKeyboardKey.numpad7 => ImageSort.values[6],
      LogicalKeyboardKey.digit8 || LogicalKeyboardKey.numpad8 => ImageSort.values[7],
      LogicalKeyboardKey.digit9 || LogicalKeyboardKey.numpad9 => ImageSort.values[8],
      _ => null,
    };

    if (selected == null) {
      return KeyEventResult.ignored;
    }

    ref.read(galleryControllerProvider.notifier).refreshForSort(selected);
    return KeyEventResult.handled;
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
          return Tooltip(
            message: 'Alt+${index + 1}',
            child: ChoiceChip(
              label: Text(sort.label),
              selected: sort == selectedSort,
              onSelected: (_) => onSelected(sort),
            ),
          );
        },
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemCount: ImageSort.values.length,
      ),
    );
  }
}

class _GalleryGrid extends StatefulWidget {
  const _GalleryGrid({
    required this.cacheManager,
    required this.items,
    required this.isLoadingMore,
    required this.errorMessage,
    required this.onLoadMore,
    required this.onOpen,
  });

  final CacheManager cacheManager;
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
    final width = MediaQuery.sizeOf(context).width;
    final crossAxisCount = width >= 1100
        ? 5
        : width >= 800
            ? 4
            : width >= 600
                ? 3
                : 2;

    return CustomScrollView(
      controller: _scrollController,
      cacheExtent: 1600,
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
              return _GalleryTile(
                key: ValueKey(item.id),
                cacheManager: widget.cacheManager,
                item: item,
                onTap: () => widget.onOpen(index),
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

class _GalleryTile extends StatefulWidget {
  const _GalleryTile({
    super.key,
    required this.cacheManager,
    required this.item,
    required this.onTap,
  });

  final CacheManager cacheManager;
  final ImageItem item;
  final VoidCallback onTap;

  @override
  State<_GalleryTile> createState() => _GalleryTileState();
}

class _GalleryTileState extends State<_GalleryTile>
    with AutomaticKeepAliveClientMixin<_GalleryTile> {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return GestureDetector(
      onTap: widget.onTap,
      child: Hero(
        tag: widget.item.id,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: ColoredBox(
            color: const Color(0xFF131B34),
            child: CachedNetworkImage(
              imageUrl: widget.item.url,
              cacheManager: widget.cacheManager,
              httpHeaders: _headersFor(widget.item),
              fit: BoxFit.cover,
              memCacheWidth: 900,
              fadeInDuration: const Duration(milliseconds: 120),
              placeholder: (context, url) => const Center(
                child: CircularProgressIndicator(),
              ),
              errorWidget: (context, url, error) => const Center(
                child: Icon(Icons.broken_image_outlined),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ImageViewerPage extends ConsumerStatefulWidget {
  const ImageViewerPage({
    super.key,
    required this.items,
    required this.initialIndex,
    required this.cacheManager,
  });

  final List<ImageItem> items;
  final int initialIndex;
  final CacheManager cacheManager;

  @override
  ConsumerState<ImageViewerPage> createState() => _ImageViewerPageState();
}

class _ImageViewerPageState extends ConsumerState<ImageViewerPage> {
  late final PageController _pageController;
  final FocusNode _focusNode = FocusNode(debugLabel: 'viewer-shortcuts');
  late int _currentIndex;
  bool _isSaving = false;
  bool _showInfo = false;
  bool _showControls = true;
  final Map<String, ImageDiagnostics> _diagnosticsCache = <String, ImageDiagnostics>{};

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNode.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.items[_currentIndex];
    final overlayVisible = _showControls || _showInfo;
    final diagnostics = _diagnosticsCache[current.id];

    _ensureDiagnostics(current);

    return Focus(
      focusNode: _focusNode,
      autofocus: true,
      onKeyEvent: _handleKeyEvent,
      child: MouseRegion(
        onEnter: (_) => setState(() => _showControls = true),
        onHover: (_) => setState(() => _showControls = true),
        onExit: (_) => setState(() => _showControls = false),
        child: Scaffold(
          backgroundColor: Colors.black,
          body: Stack(
            children: [
              Positioned.fill(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => setState(() => _showControls = !_showControls),
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: widget.items.length,
                    onPageChanged: (index) {
                      setState(() {
                        _currentIndex = index;
                      });
                    },
                    itemBuilder: (context, index) {
                      final item = widget.items[index];
                      return Stack(
                        children: [
                          Positioned.fill(
                            child: Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    behavior: HitTestBehavior.translucent,
                                    onTap: previousImage,
                                  ),
                                ),
                                Expanded(
                                  child: GestureDetector(
                                    behavior: HitTestBehavior.translucent,
                                    onTap: nextImage,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Center(
                            child: InteractiveViewer(
                              minScale: 0.8,
                              maxScale: 4,
                              child: Hero(
                                tag: item.id,
                                child: CachedNetworkImage(
                                  imageUrl: item.url,
                                  cacheManager: widget.cacheManager,
                                  httpHeaders: _headersFor(item),
                                  fit: BoxFit.contain,
                                  fadeInDuration: const Duration(milliseconds: 120),
                                  placeholder: (context, url) => const Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                  errorWidget: (context, url, error) =>
                                      const Icon(Icons.broken_image_outlined, size: 64),
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 150),
                  opacity: overlayVisible ? 1 : 0,
                  child: IgnorePointer(
                    ignoring: !overlayVisible,
                    child: SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        child: Row(
                          children: [
                            IconButton(
                              onPressed: () => Navigator.of(context).maybePop(),
                              icon: const Icon(Icons.arrow_back),
                            ),
                            Expanded(
                              child: Text(
                                '${current.sort.label}  ${_currentIndex + 1}/${widget.items.length}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            IconButton(
                              onPressed: () => setState(() => _showInfo = !_showInfo),
                              icon: const Icon(Icons.info_outline),
                            ),
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
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 16,
                top: 0,
                bottom: 0,
                child: _ViewerSideButton(
                  visible: overlayVisible,
                  icon: Icons.chevron_left,
                  onPressed: previousImage,
                ),
              ),
              Positioned(
                right: 16,
                top: 0,
                bottom: 0,
                child: _ViewerSideButton(
                  visible: overlayVisible,
                  icon: Icons.chevron_right,
                  onPressed: nextImage,
                ),
              ),
              Positioned(
                right: 16,
                bottom: 24,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 150),
                  opacity: _showInfo ? 1 : 0,
                  child: IgnorePointer(
                    ignoring: !_showInfo,
                    child: _InfoPanel(
                      item: current,
                      index: _currentIndex + 1,
                      diagnostics: diagnostics,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) {
      return KeyEventResult.ignored;
    }

    if (event.logicalKey == LogicalKeyboardKey.escape) {
      Navigator.of(context).maybePop();
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
      previousImage();
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.arrowRight) {
      nextImage();
      return KeyEventResult.handled;
    }
    if (event.logicalKey == LogicalKeyboardKey.keyI) {
      setState(() => _showInfo = !_showInfo);
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  void previousImage() {
    if (_currentIndex == 0) {
      return;
    }
    _pageController.previousPage(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
    );
  }

  void nextImage() {
    if (_currentIndex >= widget.items.length - 1) {
      return;
    }
    _pageController.nextPage(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
    );
  }

  Future<void> _ensureDiagnostics(ImageItem item) async {
    if (_diagnosticsCache.containsKey(item.id)) {
      return;
    }

    final cacheKey = _cacheKeyFor(item);
    final provider = CachedNetworkImageProvider(
      item.url,
      headers: _headersFor(item),
      cacheManager: widget.cacheManager,
      cacheKey: cacheKey,
    );

    final cacheStatus = await provider.obtainCacheStatus(
      configuration: createLocalImageConfiguration(context),
    );
    final fileInfo = await widget.cacheManager.getFileFromCache(cacheKey);
    final diskFile = fileInfo?.file;
    final fileLength = diskFile != null && await diskFile.exists() ? await diskFile.length() : null;
    final imageSize = await _decodeImageSize(provider);

    if (!mounted) {
      return;
    }

    setState(() {
      _diagnosticsCache[item.id] = ImageDiagnostics(
        width: imageSize?.$1,
        height: imageSize?.$2,
        memoryCached: cacheStatus?.keepAlive ?? false,
        diskCached: fileInfo != null,
        diskBytes: fileLength,
      );
    });
  }

  Future<(int, int)?> _decodeImageSize(ImageProvider<Object> provider) async {
    final stream = provider.resolve(createLocalImageConfiguration(context));
    final completer = Completer<(int, int)?>();
    late final ImageStreamListener listener;

    listener = ImageStreamListener(
      (imageInfo, synchronousCall) {
        if (!completer.isCompleted) {
          completer.complete((imageInfo.image.width, imageInfo.image.height));
        }
        stream.removeListener(listener);
      },
      onError: (error, stackTrace) {
        if (!completer.isCompleted) {
          completer.complete(null);
        }
        stream.removeListener(listener);
      },
    );

    stream.addListener(listener);
    return completer.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () {
        stream.removeListener(listener);
        return null;
      },
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

class _ViewerSideButton extends StatelessWidget {
  const _ViewerSideButton({
    required this.visible,
    required this.icon,
    required this.onPressed,
  });

  final bool visible;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: visible ? 1 : 0,
        child: IgnorePointer(
          ignoring: !visible,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.black54,
              borderRadius: BorderRadius.circular(999),
            ),
            child: IconButton(
              onPressed: onPressed,
              icon: Icon(icon, size: 32),
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoPanel extends StatelessWidget {
  const _InfoPanel({
    required this.item,
    required this.index,
    required this.diagnostics,
  });

  final ImageItem item;
  final int index;
  final ImageDiagnostics? diagnostics;

  @override
  Widget build(BuildContext context) {
    final uri = Uri.tryParse(item.url);
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 360),
      child: Card(
        color: const Color(0xCC101826),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: DefaultTextStyle(
            style: Theme.of(context).textTheme.bodyMedium!,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              spacing: 8,
              children: [
                Text('第 $index 张', style: Theme.of(context).textTheme.titleMedium),
                Text('分类：${item.sort.label}'),
                Text('像素：${_formatDimensions(diagnostics)}'),
                Text('域名：${uri?.host ?? 'unknown'}'),
                Text('抓取时间：${DateFormat('yyyy-MM-dd HH:mm:ss').format(item.fetchedAt)}'),
                Text('Referer：${item.referer ?? 'none'}'),
                Text('内存缓存：${_formatMemoryCache(diagnostics)}'),
                Text('磁盘缓存：${_formatDiskCache(diagnostics)}'),
                if (diagnostics?.diskBytes != null)
                  Text('缓存文件大小：${_formatBytes(diagnostics!.diskBytes!)}'),
                SelectableText(item.url, maxLines: 3),
                const Text('快捷键：Esc 返回，左右键翻页，I 显示信息，Alt+数字切换标签。'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDimensions(ImageDiagnostics? value) {
    if (value?.width == null || value?.height == null) {
      return 'loading';
    }
    return '${value!.width} x ${value.height}';
  }

  String _formatMemoryCache(ImageDiagnostics? value) {
    if (value == null) {
      return 'loading';
    }
    return value.memoryCached ? 'hit' : 'miss';
  }

  String _formatDiskCache(ImageDiagnostics? value) {
    if (value == null) {
      return 'loading';
    }
    return value.diskCached ? 'hit' : 'miss';
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    }
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
  }
}

class ImageDiagnostics {
  const ImageDiagnostics({
    required this.width,
    required this.height,
    required this.memoryCached,
    required this.diskCached,
    required this.diskBytes,
  });

  final int? width;
  final int? height;
  final bool memoryCached;
  final bool diskCached;
  final int? diskBytes;
}

Map<String, String>? _headersFor(ImageItem item) {
  if (item.referer == null) {
    return null;
  }
  return <String, String>{'Referer': item.referer!};
}

String _cacheKeyFor(ImageItem item) {
  return item.referer == null ? item.url : '${item.url}|${item.referer}';
}
