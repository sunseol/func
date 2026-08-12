export const REPORT_STYLES = `
.page-container {
  width: 100%;
  max-width: 210mm;
  min-height: 297mm;
  padding: 15mm;
  margin: 20px auto;
  background: white;
  box-shadow: 0 0 15px rgba(0,0,0,0.1);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}
.report-content-wrapper {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Malgun Gothic', Arial, Helvetica, sans-serif;
  width: 100%;
  height: 100%;
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
  color: #1f2937;
  line-height: 1.6;
}
.report-content-wrapper * {
  max-width: 100%;
  box-sizing: border-box;
}
.report-content-wrapper .container {
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
}
.report-content-wrapper .header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #2563eb;
}
.report-content-wrapper .section {
  margin: 1.25rem 0;
}
.report-content-wrapper .content {
  color: #374151;
}
.report-content-wrapper .highlight-box {
  margin: 1rem 0;
  padding: 1rem;
  border-left: 4px solid #2563eb;
  background: #eff6ff;
  border-radius: 0.25rem;
}
.report-content-wrapper h1,
.report-content-wrapper h2,
.report-content-wrapper h3,
.report-content-wrapper h4,
.report-content-wrapper h5,
.report-content-wrapper h6 {
  margin: 1rem 0 0.5rem;
  color: #111827;
  line-height: 1.25;
}
.report-content-wrapper p { margin: 0.5rem 0; }
.report-content-wrapper ul,
.report-content-wrapper ol { margin: 0.75rem 0; padding-left: 1.5rem; }
.report-content-wrapper li { margin: 0.25rem 0; }
.report-content-wrapper table {
  width: 100%;
  margin: 1rem 0;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.report-content-wrapper th,
.report-content-wrapper td {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  text-align: left;
  vertical-align: top;
}
.report-content-wrapper th { background: #f3f4f6; font-weight: 600; }
.animated-progress .ant-progress-inner { background-color: #e6f7ff; }
.animated-progress .ant-progress-bg {
  background-image: linear-gradient(90deg, #1890ff 25%, #40a9ff 50%, #69c0ff 75%, #91d5ff 100%);
  background-size: 200% 100%;
  animation: progress-animation 2s linear infinite;
}
@keyframes progress-animation {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@media print {
  @page { size: A4; margin: 15mm; }
  body, .report-generator-container { background: white !important; }
  body * { visibility: hidden; }
  .printable-area, .printable-area * { visibility: visible; }
  .printable-area { position: static; width: auto; padding: 0 !important; }
  .page-container { margin: 0; box-shadow: none; border: none; padding: 0; min-height: initial; }
  .non-printable { display: none; }
  .ant-card, .ant-card-body { border: none !important; padding: 0 !important; box-shadow: none !important; }
}
`;
