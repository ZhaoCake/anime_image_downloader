import '../config/app_settings.dart';
import '../model/image_item.dart';
import '../model/image_sort.dart';
import '../network/cnmiw_client.dart';

class ImageRepository {
  ImageRepository(this._client);

  final CnmiwClient _client;

  Future<List<ImageItem>> fetchPage({
    required AppSettings settings,
    required ImageSort sort,
    required int count,
  }) async {
    final items = await _client.fetchImages(
      settings: settings,
      sort: sort,
      count: count,
    );

    final deduped = <String, ImageItem>{};
    for (final item in items) {
      deduped[item.id] = item;
    }
    return deduped.values.toList();
  }

  Future<List<int>> download(ImageItem image) {
    return _client.downloadImageBytes(image);
  }
}
