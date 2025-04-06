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
              content: "당신은 프로젝트별 업무 내용을 특정 형식의 일간 보고서로 변환하는 비서입니다. 입력된 정보를 바탕으로 정확히 지정된 형식에 맞게 일간 보고서를 작성해주세요."
            },
            {
              role: "user",
              content: `다음 정보를 바탕으로 아래 형식에 맞게 일간 업무 보고서를 작성해주세요:

입력 정보:
이름: ${data.userName}
날짜: ${data.date}
${formatPromptData(data)}

출력 형식:
업무보고_ ${data.userName}
${formatDateForOutput(data.date)}
――――――――――――――   
[금일 진행 업무]

${formatPromptDataForTemplate(data)}
`
            }
          ],
          temperature: 0.3,
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

// 날짜 포맷 변환 함수 (예: 2025.4.4(금) -> 2025.04.04.금요일)
function formatDateForOutput(dateStr: string): string {
  try {
    // 날짜 문자열에서 년, 월, 일, 요일 추출
    const match = dateStr.match(/(\d+)\.(\d+)\.(\d+)\((.)\)/);
    
    if (!match) return dateStr;
    
    const [_, year, month, day, weekdayShort] = match;
    
    // 요일 매핑
    const weekdayMap: {[key: string]: string} = {
      '월': '월요일',
      '화': '화요일',
      '수': '수요일',
      '목': '목요일',
      '금': '금요일',
      '토': '토요일',
      '일': '일요일'
    };
    
    // 월, 일을 2자리로 포맷팅
    const formattedMonth = month.padStart(2, '0');
    const formattedDay = day.padStart(2, '0');
    const fullWeekday = weekdayMap[weekdayShort] || weekdayShort;
    
    return `${year}.${formattedMonth}.${formattedDay}.${fullWeekday}`;
  } catch (e) {
    // 에러 발생 시 원본 문자열 반환
    return dateStr;
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

// 템플릿에 맞춘 프롬프트 포맷팅
function formatPromptDataForTemplate(data: ReportData): string {
  let prompt = '';
  
  // 모든 프로젝트와 기타 업무를 하나의 리스트로 처리
  const allItems: { title: string; tasks: TaskItem[] }[] = [
    ...data.projects.map(project => ({ title: project.name, tasks: project.tasks })),
  ];
  
  // 기타 업무가 있으면 추가
  if (data.miscTasks.length > 0 && data.miscTasks.some(task => task.description)) {
    allItems.push({ title: '기타 업무', tasks: data.miscTasks });
  }
  
  // 각 항목을 포맷팅
  allItems.forEach((item, idx) => {
    if (item.title && item.tasks.length > 0 && item.tasks.some(t => t.description)) {
      // 각 프로젝트/기타 업무를 ◼ 형식으로 표시
      item.tasks.forEach((task, taskIdx) => {
        if (task.description) {
          // 첫 번째 태스크만 ◼ 사용, 나머지는 하위 항목으로
          if (taskIdx === 0) {
            prompt += `◼ ${task.description}\n`;
          } else {
            prompt += `- ${task.description}\n`;
          }
          
          // 협업자 정보는 생략 (협업자 정보 포함이 필요하면 아래 주석 해제)
          // if (task.collaborator) {
          //   prompt += `  ${task.collaborator}\n`;
          // }
          
          // 후속 조치는 > 형식으로 표시
          if (task.followUp) {
            prompt += `  > ${task.followUp}\n`;
          }
          
          // 태스크 간 적절한 줄바꿈 추가
          if (taskIdx < item.tasks.length - 1) {
            prompt += '\n';
          }
        }
      });
      
      // 항목 간 줄바꿈 추가
      if (idx < allItems.length - 1) {
        prompt += '\n';
      }
    }
  });
  
  return prompt;
}

// API 연결 없을 때 기본 포맷팅 적용
function formatDefaultReport(data: ReportData): string {
  // 지정된 형식에 맞는 출력 형식
  let result = `업무보고_ ${data.userName}\n`;
  result += `${formatDateForOutput(data.date)}\n`;
  result += '――――――――――――――\n';
  result += '[금일 진행 업무]\n\n';
  
  // 모든 프로젝트와 태스크를 지정된 형식으로 포맷팅
  result += formatPromptDataForTemplate(data);
  
  return result;
} 