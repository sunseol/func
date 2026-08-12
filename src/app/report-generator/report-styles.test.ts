import { REPORT_STYLES } from './report-styles';

describe('trusted report styles', () => {
  it('defines scoped semantic report classes and table/list typography', () => {
    expect(REPORT_STYLES).toContain('.report-content-wrapper .container');
    expect(REPORT_STYLES).toContain("'Noto Sans KR'");
    expect(REPORT_STYLES).toContain("-apple-system");
    expect(REPORT_STYLES).toContain('.report-content-wrapper .header');
    expect(REPORT_STYLES).toContain('.report-content-wrapper .section');
    expect(REPORT_STYLES).toContain('.report-content-wrapper .content');
    expect(REPORT_STYLES).toContain('.report-content-wrapper .highlight-box');
    expect(REPORT_STYLES).toContain('.report-content-wrapper table');
    expect(REPORT_STYLES).toContain('.report-content-wrapper ul');
  });
});
