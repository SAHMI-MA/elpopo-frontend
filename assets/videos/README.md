# Videos

Drop video files in this folder and reference them from `frontend/js/config.js`
under `SITE_CONFIG.videos`.

## Two ways to swap a video

**Option 1 — keep the filename.** Replace the file in this folder, keep the
same name (`hero.mp4`, `product-demo.mp4`, `about.mp4`). No code change.

**Option 2 — change the path in config.js.** Edit `SITE_CONFIG.videos.<key>.src`
to a different filename or a full URL (CDN, S3, Cloudflare Stream, etc.).

## Use in HTML

Any `<video>` tag with a matching `data-cfg-video` key gets its `src` + `poster`
filled in automatically by `app.js`:

```html
<video data-cfg-video="hero" muted autoplay loop playsinline preload="metadata">
  <source>
</video>
```

## Recommended attributes

- `muted` + `autoplay` + `playsinline` — the only combination browsers honour
  for autoplay on mobile.
- `preload="metadata"` (not `auto`) for non-hero videos — saves bandwidth.
- Always set a `poster` image so the frame before play looks intentional.
- For heavy videos, consider hosting on YouTube/Vimeo or a streaming CDN
  instead of self-hosting.

## File sizes

Keep self-hosted videos under ~5 MB for mobile users. Encode with H.264 + AAC
in an MP4 container for the broadest browser support.
