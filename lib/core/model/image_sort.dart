enum ImageSort {
  cdnRandom('CDNrandom', 'CDN Random', false),
  cdnIw233('CDNiw233', 'CDN 无色图', false),
  cdnTop('CDNtop', 'CDN 精选', false),
  random('random', '随机全部图', true),
  iw233('iw233', '随机无色图', true),
  top('top', '精选图', true),
  setu('setu', '随机色图', true),
  pc('pc', '横屏壁纸', true),
  mp('mp', '竖屏壁纸', true),
  cat('cat', '兽耳', true),
  yin('yin', '银发', true),
  xing('xing', '星空', true);

  const ImageSort(this.apiValue, this.label, this.needsReferer);

  final String apiValue;
  final String label;
  final bool needsReferer;

  static ImageSort fromApiValue(String value) {
    return ImageSort.values.firstWhere(
      (sort) => sort.apiValue == value,
      orElse: () => ImageSort.cdnRandom,
    );
  }
}
