import 'image_sort.dart';

class ImageItem {
  const ImageItem({
    required this.url,
    required this.sort,
    required this.referer,
    required this.fetchedAt,
  });

  final String url;
  final ImageSort sort;
  final String? referer;
  final DateTime fetchedAt;

  String get id => '$url|${sort.apiValue}';
}
