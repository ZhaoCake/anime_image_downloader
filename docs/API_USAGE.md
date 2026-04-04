# CNMIW API Usage

## Base endpoint

- `GET {baseUrl}/api.php?sort=<sort>`

## Supported query parameters

- `type=json`: return JSON instead of redirecting directly to one image
- `num=<n>`: number of images to return when `type=json` is used
- `num` maximum is `100`

## Sort values

### CDN-first sorts

- `CDNrandom`
- `CDNiw233`
- `CDNtop`

These sorts redirect to `setu.iw233` image hosts and normally work without a custom `Referer`.

### Referer-required sorts

- `random`
- `iw233`
- `top`
- `setu`
- `pc`
- `mp`
- `cat`
- `yin`
- `xing`

These sorts should be requested with:

```text
Referer: https://weibo.com/
```

Without that header, the API may still redirect but the final resource is not reliably usable.

## JSON example

```text
GET https://cnmiw.com/api.php?sort=CDNrandom&type=json&num=2
```

Example response:

```json
{"pic":["https://setu.iw233.top/large/example-a.jpg","https://setu.iw233.top/large/example-b.jpg"]}
```

## Recommended client strategy

1. Default to `CDNrandom` on first launch.
2. Use `type=json&num=<page-size>` for gallery loading.
3. For non-CDN sorts, always send `Referer: https://weibo.com/`.
4. Use the same request headers for preview and download.
5. Keep `baseUrl` configurable to support mirrors such as `https://idnm.de`.
