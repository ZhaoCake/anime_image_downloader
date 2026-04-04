import 'dart:convert';

import 'package:dio/dio.dart';

import '../config/app_settings.dart';
import '../model/image_item.dart';
import '../model/image_sort.dart';

class CnmiwClient {
  CnmiwClient()
      : _dio = Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 20),
            receiveTimeout: const Duration(seconds: 30),
            responseType: ResponseType.plain,
            headers: const {
              'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            },
          ),
        );

  static const _weiboReferer = 'https://weibo.com/';

  final Dio _dio;

  Future<List<ImageItem>> fetchImages({
    required AppSettings settings,
    required ImageSort sort,
    required int count,
  }) async {
    final uri = Uri.parse('${settings.baseUrl}/api.php').replace(
      queryParameters: {
        'sort': sort.apiValue,
        'type': 'json',
        'num': '$count',
      },
    );

    final response = await _dio.get<String>(
      uri.toString(),
      options: Options(headers: _headersForSort(sort)),
    );

    final body = response.data ?? '{}';
    final decoded = jsonDecode(body);
    final urls = <String>[];

    if (decoded is Map<String, dynamic> && decoded['pic'] is List) {
      for (final value in decoded['pic'] as List<dynamic>) {
        final url = value?.toString();
        if (url != null && url.isNotEmpty) {
          urls.add(url.replaceAll(r'\/', '/'));
        }
      }
    }

    if (urls.isEmpty) {
      final fallback = await fetchSingleImage(settings: settings, sort: sort);
      return [fallback];
    }

    return urls
        .map(
          (url) => ImageItem(
            url: url,
            sort: sort,
            referer: sort.needsReferer ? _weiboReferer : null,
            fetchedAt: DateTime.now(),
          ),
        )
        .toList();
  }

  Future<ImageItem> fetchSingleImage({
    required AppSettings settings,
    required ImageSort sort,
  }) async {
    final uri = Uri.parse('${settings.baseUrl}/api.php').replace(
      queryParameters: {'sort': sort.apiValue},
    );

    final response = await _dio.getUri<dynamic>(
      uri,
      options: Options(
        headers: _headersForSort(sort),
        responseType: ResponseType.bytes,
      ),
    );

    final finalUri = response.realUri.toString();
    if (finalUri == uri.toString()) {
      throw StateError('Image API did not redirect to an image URL.');
    }

    return ImageItem(
      url: finalUri,
      sort: sort,
      referer: sort.needsReferer ? _weiboReferer : null,
      fetchedAt: DateTime.now(),
    );
  }

  Future<List<int>> downloadImageBytes(ImageItem image) async {
    final response = await _dio.get<List<int>>(
      image.url,
      options: Options(
        responseType: ResponseType.bytes,
        headers: image.referer == null
            ? null
            : <String, String>{'Referer': image.referer!},
      ),
    );
    return response.data ?? const <int>[];
  }

  Map<String, String>? _headersForSort(ImageSort sort) {
    if (!sort.needsReferer) {
      return null;
    }
    return const <String, String>{'Referer': _weiboReferer};
  }
}
