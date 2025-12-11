'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Project, TaskItem, ReportData } from '../api/grop';

// Zod Schema
const taskSchema = z.object({
  description: z.string().min(1, '업무 내용을 입력해주세요.'),
  collaborator: z.string().optional(),
  status: z.string().default('진행 중'),
});

const projectSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요.'),
  tasks: z.array(taskSchema),
});

const inputFormSchema = z.object({
  userName: z.string().min(1, '이름을 입력해주세요.'),
  date: z.date({ required_error: '날짜를 선택해주세요.' }),
  projects: z.array(projectSchema),
  miscTasks: z.array(taskSchema),
});

type InputFormValues = z.infer<typeof inputFormSchema>;

interface InputFormProps {
  onDataChange: (data: {
    userName: string;
    date: string;
    projects: Project[];
    miscTasks: TaskItem[];
  }) => void;
  initialData: ReportData;
}

const formatCollaborator = (value: string | undefined): string => {
  if (!value || !value.trim()) return '';
  if (value.trim().startsWith('/w')) return value;
  return `/w ${value.trim()}`;
};

export default function InputForm({ onDataChange, initialData }: InputFormProps) {
  const form = useForm<InputFormValues>({
    resolver: zodResolver(inputFormSchema),
    defaultValues: {
      userName: initialData.userName || '',
      date: initialData.date ? new Date(initialData.date) : new Date(),
      projects: initialData.projects && initialData.projects.length > 0
        ? initialData.projects
        : [],
      miscTasks: initialData.miscTasks && initialData.miscTasks.length > 0
        ? initialData.miscTasks
        : [],
    },
  });

  const { fields: projectFields, append: appendProject, remove: removeProject } = useFieldArray({
    control: form.control,
    name: 'projects',
  });

  const { fields: miscTaskFields, append: appendMiscTask, remove: removeMiscTask } = useFieldArray({
    control: form.control,
    name: 'miscTasks',
  });

  // Watch for changes and notify parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!value.date) return;

      const formattedDate = format(value.date, 'yyyy-MM-dd eeee', { locale: ko });

      // Transform data to match parent expectation
      // We cast types because watch partials are slightly loose
      const transformedProjects = (value.projects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        tasks: (p.tasks || []).map((t: any) => ({
          description: t.description,
          collaborator: formatCollaborator(t.collaborator),
          status: t.status
        }))
      }));

      const transformedMiscTasks = (value.miscTasks || []).map((t: any) => ({
        description: t.description,
        collaborator: formatCollaborator(t.collaborator),
        status: t.status
      }));

      onDataChange({
        userName: value.userName as string,
        date: formattedDate,
        projects: transformedProjects,
        miscTasks: transformedMiscTasks
      });
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  // Sync initialData if it changes externally (e.g. clear)
  useEffect(() => {
    // Need care here to avoid infinite loops if onDataChange triggers parent state update
    // Only reset if completely different or empty?
    // Actually standard pattern is to only use initialValues.
    // But Home page resets form on logout.
    if (!initialData.userName && !initialData.date) {
      // Assume reset
      form.reset({
        userName: '',
        date: undefined,
        projects: [],
        miscTasks: []
      });
    } else if (initialData.userName !== form.getValues('userName')) {
      form.setValue('userName', initialData.userName);
    }
  }, [initialData.userName, initialData.date, form]);


  return (
    <Form {...form}>
      <form className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="이름 입력" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>날짜</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ko })
                          ) : (
                            <span>날짜를 선택하세요</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>프로젝트별 업무</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendProject({ name: '', tasks: [{ description: '', collaborator: '', status: '진행 중' }] })}
            >
              <Plus className="mr-2 h-4 w-4" /> 프로젝트 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {projectFields.map((field, index) => (
              <ProjectItem
                key={field.id}
                index={index}
                control={form.control}
                remove={removeProject}
                canRemove={projectFields.length > 0}
              />
            ))}
            {projectFields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                프로젝트가 없습니다. 프로젝트를 추가해주세요.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>기타 업무</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendMiscTask({ description: '', collaborator: '', status: '진행 중' })}
            >
              <Plus className="mr-2 h-4 w-4" /> 기타 업무 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {miscTaskFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start group">
                <FormField
                  control={form.control}
                  name={`miscTasks.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Textarea placeholder="예: 팀 주간 회의 참석" className="resize-none min-h-[40px]" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`miscTasks.${index}.collaborator`}
                  render={({ field }) => (
                    <FormItem className="w-[140px]">
                      <FormControl>
                        <Input placeholder="협업자 (/w 이름)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeMiscTask(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {miscTaskFields.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                등록된 기타 업무가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

// Sub-component for Project with nested tasks field array
function ProjectItem({ index, control, remove, canRemove }: { index: number, control: Control<InputFormValues>, remove: (index: number) => void, canRemove: boolean }) {
  const { fields, append, remove: removeTask } = useFieldArray({
    control,
    name: `projects.${index}.tasks`
  });

  return (
    <Card className="border-secondary/50">
      <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0">
        <div className="flex-1 mr-4">
          <FormField
            control={control}
            name={`projects.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="프로젝트명 (예: 신규 서비스 기획)" className="font-semibold" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
          onClick={() => remove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {fields.map((taskField, taskIndex) => (
          <div key={taskField.id} className="flex gap-2 items-start">
            <div className="pt-2 text-xs text-muted-foreground w-8 text-center">{taskIndex + 1}</div>
            <FormField
              control={control}
              name={`projects.${index}.tasks.${taskIndex}.description`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Textarea
                      placeholder="예: 사용자 인터페이스 설계"
                      className="resize-none min-h-[40px]"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`projects.${index}.tasks.${taskIndex}.collaborator`}
              render={({ field }) => (
                <FormItem className="w-[120px]">
                  <FormControl>
                    <Input placeholder="협업자" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeTask(taskIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full border border-dashed text-muted-foreground hover:text-primary"
          onClick={() => append({ description: '', collaborator: '', status: '진행 중' })}
        >
          <Plus className="mr-2 h-3 w-3" /> 업무 추가
        </Button>
      </CardContent>
    </Card>
  );
}