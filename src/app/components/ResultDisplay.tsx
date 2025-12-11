'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming scroll-area might be useful, or just div overflow

interface ResultDisplayProps {
  textToDisplay: string | null;
  isLoading: boolean;
}

export default function ResultDisplay({
  textToDisplay,
  isLoading
}: ResultDisplayProps) {

  const handleCopy = () => {
    if (textToDisplay) {
      navigator.clipboard.writeText(textToDisplay);
      toast.success('클립보드에 복사되었습니다!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px] gap-4">
        <div className="text-muted-foreground">AI 보고서 생성 중...</div>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!textToDisplay) {
    return (
      <div className="flex justify-center items-center h-[400px] text-muted-foreground text-center border rounded-md border-dashed">
        입력된 내용 기반의 보고서가 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <div className="relative border rounded-md bg-muted/30 h-[400px] flex flex-col">
      <div className="flex items-center justify-between p-2 border-b bg-background/50 backdrop-blur sticky top-0">
        <span className="text-xs font-medium text-muted-foreground px-2">Preview</span>
        <Button onClick={handleCopy} size="sm" variant="ghost" className="h-8 gap-1">
          <ClipboardCheck className="h-4 w-4" /> 복사
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
          {textToDisplay}
        </pre>
      </div>
    </div>
  );
}
