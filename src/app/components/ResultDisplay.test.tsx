import { render, screen } from '@testing-library/react';
import { App } from 'antd';
import ResultDisplay from './ResultDisplay';

describe('ResultDisplay copy control', () => {
  it('keeps the copy button touch-safe while preserving its button semantics', () => {
    render(
      <App>
        <ResultDisplay textToDisplay="A generated report" isLoading={false} />
      </App>,
    );

    const copyButton = screen.getByRole('button', { name: '복사' });

    expect(copyButton).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
  });
});
