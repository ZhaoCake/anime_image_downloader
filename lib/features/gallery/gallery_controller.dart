import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/settings_controller.dart';
import '../../core/model/image_item.dart';
import '../../core/model/image_sort.dart';
import '../../core/network/cnmiw_client.dart';
import '../../core/repository/image_repository.dart';

final cnmiwClientProvider = Provider<CnmiwClient>((ref) => CnmiwClient());

final imageRepositoryProvider = Provider<ImageRepository>((ref) {
  return ImageRepository(ref.read(cnmiwClientProvider));
});

final galleryControllerProvider =
    AsyncNotifierProvider<GalleryController, GalleryState>(GalleryController.new);

class GalleryState {
  const GalleryState({
    required this.selectedSort,
    required this.items,
    required this.isLoadingMore,
    this.errorMessage,
  });

  final ImageSort selectedSort;
  final List<ImageItem> items;
  final bool isLoadingMore;
  final String? errorMessage;

  GalleryState copyWith({
    ImageSort? selectedSort,
    List<ImageItem>? items,
    bool? isLoadingMore,
    String? errorMessage,
    bool clearError = false,
  }) {
    return GalleryState(
      selectedSort: selectedSort ?? this.selectedSort,
      items: items ?? this.items,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class GalleryController extends AsyncNotifier<GalleryState> {
  static const pageSize = 30;

  @override
  Future<GalleryState> build() async {
    final settings = await ref.watch(settingsControllerProvider.future);
    final items = await ref.read(imageRepositoryProvider).fetchPage(
          settings: settings,
          sort: ImageSort.cdnRandom,
          count: pageSize,
        );
    return GalleryState(
      selectedSort: ImageSort.cdnRandom,
      items: items,
      isLoadingMore: false,
    );
  }

  Future<void> refreshForSort(ImageSort sort) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final settings = await ref.read(settingsControllerProvider.future);
      final items = await ref.read(imageRepositoryProvider).fetchPage(
            settings: settings,
            sort: sort,
            count: pageSize,
          );
      return GalleryState(
        selectedSort: sort,
        items: items,
        isLoadingMore: false,
      );
    });
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.isLoadingMore) {
      return;
    }

    state = AsyncData(current.copyWith(isLoadingMore: true, clearError: true));

    try {
      final settings = await ref.read(settingsControllerProvider.future);
      final nextItems = await ref.read(imageRepositoryProvider).fetchPage(
            settings: settings,
            sort: current.selectedSort,
            count: pageSize,
          );
      final merged = <String, ImageItem>{
        for (final item in current.items) item.id: item,
        for (final item in nextItems) item.id: item,
      };
      state = AsyncData(
        current.copyWith(
          items: merged.values.toList(),
          isLoadingMore: false,
          clearError: true,
        ),
      );
    } catch (error) {
      state = AsyncData(
        current.copyWith(
          isLoadingMore: false,
          errorMessage: error.toString(),
        ),
      );
    }
  }
}
