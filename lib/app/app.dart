import 'package:flutter/material.dart';

import '../features/gallery/gallery_page.dart';

class AnimeImageApp extends StatelessWidget {
  const AnimeImageApp({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF625BFF),
      brightness: Brightness.dark,
    );

    return MaterialApp(
      title: 'Anime Image Downloader',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: colorScheme,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0B1020),
        appBarTheme: const AppBarTheme(centerTitle: false),
      ),
      home: const GalleryPage(),
    );
  }
}
