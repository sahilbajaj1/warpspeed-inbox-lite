/**
 * Best-effort sanitization before handing HTML to a locked-down WebView.
 * Not a full HTML sanitizer — defense in depth alongside JS disabled + nav blocking.
 */
export function sanitizeEmailHtml(html: string): string {
  let output = html;

  // Remove script/style/iframe/object/embed blocks.
  output = output.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  output = output.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  output = output.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  output = output.replace(/<embed\b[^>]*>/gi, '');
  output = output.replace(/<link\b[^>]*>/gi, '');
  output = output.replace(/<meta\b[^>]*>/gi, '');

  // Strip inline event handlers and javascript: URLs.
  output = output.replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');
  output = output.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"');
  output = output.replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');

  return output;
}

export function estimateHtmlBodyHeight(htmlLength: number): number {
  const estimated = Math.ceil(htmlLength / 90) * 18;
  return Math.min(480, Math.max(140, estimated));
}

export function wrapEmailHtmlDocument(bodyHtml: string, textColor: string, background: string): string {
  const safe = sanitizeEmailHtml(bodyHtml);
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      :root { color-scheme: light dark; }
      html, body {
        margin: 0;
        padding: 0;
        background: ${background};
        color: ${textColor};
        font: 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        word-wrap: break-word;
        overflow-wrap: anywhere;
      }
      img, video { max-width: 100%; height: auto; }
      a { color: #2563EB; }
      table { max-width: 100%; }
      pre, code { white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>${safe}</body>
</html>`;
}
