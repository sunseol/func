// grop API 연결을 위한 함수

interface TaskItem {
  id: string;
  description: string;
  collaborator?: string;
  followUp?: string;
}

interface Project {
  id: string;
  name: string;
  tasks: TaskItem[];
}

interface ReportData {
  userName: string;
  date: string;
  projects: Project[];
  miscTasks: TaskItem[];
}

// GROQ API 호출을 위한 함수
export async function generateReport(data: ReportData): Promise<string> {
  try {
    const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    
    // API 키가 없는 경우 기본 형식으로 반환
    if (!GROQ_API_KEY) {
      console.warn('GROQ API 키가 설정되지 않았습니다. 환경변수를 확인하세요.');
      return formatDefaultReport(data);
    }

    // GROQ API 호출
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: "당신은 프로젝트별 업무 내용을 자연스러운 문장으로 변환하는 비서입니다. 입력된 정보를 바탕으로 자연스러운 일간 보고서를 작성해주세요."
            },
            {
              role: "user",
              content: `다음 정보를 바탕으로 자연스러운 일간 업무 보고서를 작성해주세요:
              이름: ${data.userName}
              날짜: ${data.date}
              
              ${formatPromptData(data)}
              `
            }
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error('GROQ API 호출 중 오류 발생:', error);
      return formatDefaultReport(data);
    }
  } catch (error) {
    console.error('보고서 생성 중 오류가 발생했습니다:', error);
    return formatDefaultReport(data);
  }
}

// GROQ API 프롬프트 포맷팅
function formatPromptData(data: ReportData): string {
  let prompt = '';
  
  // 프로젝트별 업무
  if (data.projects.length > 0) {
    prompt += "프로젝트별 업무:\n";
    data.projects.forEach((project, index) => {
      if (project.name && project.tasks.length > 0) {
        prompt += `${index + 1}. ${project.name}\n`;
        
        project.tasks.forEach(task => {
          if (task.description) {
            prompt += `- ${task.description}`;
            
            if (task.collaborator) {
              prompt += ` ${task.collaborator}`;
            }
            
            if (task.followUp) {
              prompt += `\n  => ${task.followUp}`;
            }
            
            prompt += '\n';
          }
        });
        
        prompt += '\n';
      }
    });
  }

  // 기타 업무
  if (data.miscTasks.length > 0 && data.miscTasks.some(task => task.description)) {
    prompt += "기타 업무:\n";
    
    data.miscTasks.forEach(task => {
      if (task.description) {
        prompt += `- ${task.description}\n`;
      }
    });
  }

  return prompt;
}

// API 연결 없을 때 기본 포맷팅 적용
function formatDefaultReport(data: ReportData): string {
  let result = `${data.userName}님의 일간 보고서 (${data.date})\n`;
  result += '――――――――――――――\n\n';

  // 프로젝트별 업무
  if (data.projects.length > 0) {
    data.projects.forEach((project, index) => {
      if (project.name && project.tasks.length > 0) {
        result += `${index + 1}. ${project.name}\n`;
        
        project.tasks.forEach(task => {
          if (task.description) {
            result += `- ${task.description}`;
            
            if (task.collaborator) {
              result += ` ${task.collaborator}`;
            }
            
            if (task.followUp) {
              result += `\n  => ${task.followUp}`;
            }
            
            result += '\n';
          }
        });
        
        result += '\n';
      }
    });
  }

  // 기타 업무
  if (data.miscTasks.length > 0 && data.miscTasks.some(task => task.description)) {
    result += '기타 업무\n';
    
    data.miscTasks.forEach(task => {
      if (task.description) {
        result += `- ${task.description}\n`;
      }
    });
  }

  return result;
} 