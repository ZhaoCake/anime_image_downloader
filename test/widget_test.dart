import 'package:anime_image_downloader_flutter/app/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app bootstraps', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: AnimeImageApp()));
    expect(find.text('Anime Image Downloader'), findsOneWidget);
  });
}
