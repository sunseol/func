import { sanitizeHtml, sanitizeReportHtml } from '../validation';

describe('sanitizeHtml', () => {
  it('removes scripts and event handlers while preserving safe report markup', () => {
    const result = sanitizeHtml(
      '<h1>Report</h1><p onclick="alert(1)">Safe</p><script>alert(2)</script>',
    );

    expect(result).toContain('<h1>Report</h1>');
    expect(result).toContain('<p>Safe</p>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onclick');
  });

  it('preserves report formatting while removing executable attributes and tags', () => {
    const result = sanitizeReportHtml(
      '<div class="container" style="background:url(javascript:alert(1))"><h2>Summary</h2><table><tr><td>Safe</td></tr></table><img src="x" onerror="alert(1)"><style>.container{color:red}</style><script>alert(2)</script></div>',
    );

    expect(result).toContain('<div class="container"><h2>Summary</h2><table><tbody><tr><td>Safe</td></tr></tbody></table><img src="x"></div>');
    expect(result).not.toContain('style=');
    expect(result).not.toContain('<style');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onerror');
  });

  it('removes javascript URLs and SVG event payloads from report markup', () => {
    const result = sanitizeReportHtml(
      '<a href="javascript:alert(1)">link</a><svg><a onload="alert(2)">bad</a></svg>',
    );

    expect(result).toContain('<a>link</a>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('onload');
  });
});
