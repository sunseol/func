import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

class CustomReporter implements Reporter {
  private startTime: number = 0;
  private totalTests: number = 0;
  private completedTests: number = 0;

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    this.totalTests = suite.allTests().length;
    console.log(`🚀 테스트 시작: ${this.totalTests}개 테스트 실행 예정`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.completedTests++;
    const elapsed = Date.now() - this.startTime;
    const avgTimePerTest = elapsed / this.completedTests;
    const remainingTests = this.totalTests - this.completedTests;
    const estimatedTimeLeft = (remainingTests * avgTimePerTest) / 1000;

    const status = result.status === 'passed' ? '✅' : 
                   result.status === 'failed' ? '❌' : 
                   result.status === 'skipped' ? '⏭️' : '⚠️';

    console.log(
      `${status} [${this.completedTests}/${this.totalTests}] ${test.title} ` +
      `(${(result.duration / 1000).toFixed(1)}초) - ` +
      `예상 남은 시간: ${Math.ceil(estimatedTimeLeft)}초`
    );
  }

  onEnd(result: FullResult) {
    const totalTime = (Date.now() - this.startTime) / 1000;
    console.log(`\n🏁 테스트 완료! 총 소요시간: ${totalTime.toFixed(1)}초`);
    console.log(`✅ 성공: ${result.status === 'passed' ? '모든 테스트 통과' : '일부 테스트 실패'}`);
  }
}

export default CustomReporter;