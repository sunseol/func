'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  User,
  MoreHorizontal,
  Mail,
  Loader2
} from 'lucide-react';
import { ProjectMemberWithProfile } from '@/types/ai-pm';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface MemberManagementProps {
  projectId: string;
  members: ProjectMemberWithProfile[];
  onMembersUpdate: () => void;
}

export default function MemberManagement({
  projectId,
  members,
  onMembersUpdate
}: MemberManagementProps) {
  const { success, error: showError } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supabase] = useState(() => createClient());

  // This function would typically call an API endpoint to invite a user.
  // For now, we'll simulate it by searching for a user ID by email and adding to project_members.
  // In a real app, this should be a robust backend invitation flow.
  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      // 1. Find user by email (Note: This might not be possible from client-side due to security policies in Supabase)
      // Usually, you'd use an edge function/RPC for this. 
      // We will assume an API endpoint exists or we'll try to find a way.
      // For this refactor, I'll call a hypothetical API.

      const response = await fetch('/api/ai-pm/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, email: inviteEmail, role: inviteRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '초대 실패');
      }

      success('멤버 추가 성공', `${inviteEmail}님이 프로젝트에 추가되었습니다.`);
      setIsInviteOpen(false);
      setInviteEmail('');
      onMembersUpdate();

    } catch (err: any) {
      showError('멤버 추가 실패', err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('정말 이 멤버를 프로젝트에서 제외하시겠습니까?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      success('멤버 제외 완료', '멤버가 프로젝트에서 제외되었습니다.');
      onMembersUpdate();
    } catch (err: any) {
      showError('멤버 제외 실패', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>프로젝트 멤버</CardTitle>
          <CardDescription>프로젝트에 참여 중인 멤버를 관리합니다.</CardDescription>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" /> 멤버 초대
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 멤버 초대</DialogTitle>
              <DialogDescription>이메일 주소를 입력하여 새 멤버를 프로젝트에 초대하세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>취소</Button>
              <Button onClick={handleInvite} disabled={inviting}>
                {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                초대하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">사용자</TableHead>
              <TableHead>정보</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>역할</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">멤버가 없습니다.</TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell>
                    <Avatar>
                      <AvatarFallback>{member.profile?.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {member.profile?.full_name || '이름 없음'}
                  </TableCell>
                  <TableCell>{member.profile?.email}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'admin' || member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role === 'owner' ? '소유자' : member.role === 'admin' ? '관리자' : member.role === 'editor' ? '편집자' : '뷰어'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveMember(member.user_id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> 프로젝트에서 제외
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
