import {
  estimateHtmlBodyHeight,
  sanitizeEmailHtml,
  wrapEmailHtmlDocument,
} from '@/features/threads/models/html-sanitize';

describe('sanitizeEmailHtml', () => {
  it('removes scripts, event handlers, and javascript URLs', () => {
    const dirty = `
      <div onclick="alert(1)">Hello</div>
      <script>alert('x')</script>
      <a href="javascript:alert(2)">link</a>
      <iframe src="https://evil.test"></iframe>
    `;
    const clean = sanitizeEmailHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).not.toMatch(/iframe/i);
    expect(clean).toMatch(/Hello/);
  });

  it('wraps sanitized HTML in a constrained document', () => {
    const doc = wrapEmailHtmlDocument('<p onclick="x">Hi</p>', '#111', '#fff');
    expect(doc).toContain('<meta name="viewport"');
    expect(doc).toContain('Hi');
    expect(doc).not.toContain('onclick');
  });

  it('estimates a bounded height for large bodies', () => {
    expect(estimateHtmlBodyHeight(10)).toBeGreaterThanOrEqual(140);
    expect(estimateHtmlBodyHeight(200_000)).toBeLessThanOrEqual(480);
  });
});
