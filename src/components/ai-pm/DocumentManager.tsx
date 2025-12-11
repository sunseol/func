'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Loader2
} from 'lucide-react';
import {
  PlanningDocumentWithUsers,
  WorkflowStep,
  DocumentStatus
} from '@/types/ai-pm';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DocumentManagerProps {
  projectId: string;
  workflowStep: WorkflowStep;
  onDocumentSelect: (document: PlanningDocumentWithUsers) => void;
  onDocumentCreated?: (document: PlanningDocumentWithUsers) => void;
  onDocumentUpdated?: (document: PlanningDocumentWithUsers) => void;
}

export default function DocumentManager({
  projectId,
  workflowStep,
  onDocumentSelect,
  onDocumentCreated,
  onDocumentUpdated,
}: DocumentManagerProps) {
  const { success, error: showError } = useToast();
  const [documents, setDocuments] = useState<PlanningDocumentWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ai-pm/documents?projectId=${projectId}&step=${workflowStep}`
      );

      if (!response.ok) {
        throw new Error('문서 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setDocuments(data.documents);
    } catch (err: any) {
      showError('문서 목록 로드 실패', err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, workflowStep, showError]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreateDocument = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/ai-pm/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          workflow_step: workflowStep,
          title: '새 문서',
          content: '',
          status: 'private'
        })
      });

      if (!response.ok) {
        throw new Error('문서 생성에 실패했습니다.');
      }

      const { document } = await response.json();
      setDocuments(prev => [document, ...prev]);
      onDocumentSelect(document);
      if (onDocumentCreated) {
        onDocumentCreated(document);
      }
      success('문서 생성 완료', '새 문서가 생성되었습니다.');
    } catch (err: any) {
      showError('문서 생성 실패', err.message);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'official':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">공식</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">대기</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">반려</Badge>;
      default:
        return <Badge variant="secondary">개인</Badge>;
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="px-0 pt-0 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">문서 목록</CardTitle>
          <Button onClick={handleCreateDocument} disabled={creating} size="sm">
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            새 문서
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="문서 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  문서가 없습니다.
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex flex-col gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onDocumentSelect(doc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium line-clamp-1">{doc.title}</span>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                      <span>v{doc.version}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
