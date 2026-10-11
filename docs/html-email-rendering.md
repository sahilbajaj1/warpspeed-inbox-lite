# HTML email rendering trade-off

**Decision:** Render `bodyHtml` inside `react-native-webview` with JavaScript disabled and external navigation blocked, after a light sanitizer pass.

## Why WebView

Email HTML is table-heavy and CSS-quirky. Native HTML renderers often break layout. WebView gives better fidelity for real messages (including large bodies up to ~200KB).

## Security controls

1. Strip `script` / `iframe` / `object` / `embed` / `link` / `meta`, inline `on*` handlers, and `javascript:` URLs (`sanitizeEmailHtml`).
2. `javaScriptEnabled={false}` — email scripts do not execute.
3. `onShouldStartLoadWithRequest` blocks `http(s)` / `mailto` navigations and click navigations.
4. Disable file access, DOM storage, third-party cookies, and multiple windows.
5. Fallback to `bodyText` / tag-stripped text if the WebView errors.

## Accepted limitations

- Links are not tappable (intentional for this exercise).
- Remote images may still be requested by the WebView engine when present in HTML (tracking risk). A follow-up could proxy/block remote images.
- Height is estimated and capped; long bodies scroll inside the message WebView.
- Sanitizer is defense-in-depth, not a full HTML purifier.
