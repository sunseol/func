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
  reportType: 'morning' | 'evening';
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

    // 보고서 유형에 따른 제목 생성
    const reportTitle = data.reportType === 'morning' 
      ? '[금일 예정 업무]' 
      : '[금일 진행 업무]';

    // GROQ API 호출
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen-2.5-32b",
          messages: [
            {
              role: "system",
              content: `당신은 프로젝트별 업무 내용을 특정 형식의 일간 보고서로 변환하는 비서입니다. 
입력된 정보를 바탕으로 정확히 지정된 형식에 맞게 일간 보고서를 작성해주세요. 
주어진 정보를 바탕으로 부족한 부분이 있다면 합리적으로 추가 내용을 포함할 수 있습니다. 
단, 기본 형식은 반드시 유지하세요. 
결과물을 그대로 복사하여 사용할 수 있도록 추가 설명 없이 보고서만 출력해주세요.
보고서 유형은 '${data.reportType === 'morning' ? '출근 보고서(금일 예정 업무)' : '퇴근 보고서(금일 진행 업무)'}' 입니다.`
            },
            {
              role: "user",
              content: `다음 정보를 바탕으로 아래 형식에 맞게 일간 업무 보고서를 작성해주세요:

입력 정보:
이름: ${data.userName}
날짜: ${data.date}
보고서 유형: ${data.reportType === 'morning' ? '출근 보고서(금일 예정 업무)' : '퇴근 보고서(금일 진행 업무)'}
${formatPromptData(data)}

출력 형식:
업무보고_ ${data.userName}
${formatDateForOutput(data.date)}
――――――――――――――   
${reportTitle}

${formatPromptDataForTemplate(data)}

위 정보를 기반으로 보고서를 작성해주세요. 필요하다면 합리적인 범위 내에서 다음과 같은 내용을 추가할 수 있습니다:
1. 태스크의 세부 사항 확장
2. 업무 관련된 추가 세부 정보
3. 업무가 완료된 경우 결과나 성과에 대한 간단한 설명
4. 회의에 참석한 경우 주요 논의 내용
5. 추후 진행 예정인 관련 업무에 대한 언급

단, 모든 추가 정보는 실제 있을법한 자연스러운 내용이어야 하며, 주어진 형식을 철저히 지켜야 합니다.
프롬프트 또는 지시사항에 대한 언급은 결과에 포함하지 마세요. 오직 보고서 내용만 출력하세요.`
            }
          ],
          temperature: 0.5,
          max_tokens: 1500,
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
    
    const [, year, month, day, weekdayShort] = match;
    
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
  } catch (error) {
    // 에러 발생 시 원본 문자열 반환
    console.error('날짜 포맷 변환 중 오류 발생:', error);
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
            
            if (task.collaborator && task.collaborator.trim()) {
              prompt += ` ${task.collaborator}`;
            }
            
            if (task.followUp && task.followUp.trim()) {
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
        prompt += `- ${task.description}`;
        
        if (task.collaborator && task.collaborator.trim()) {
          prompt += ` ${task.collaborator}`;
        }
        
        if (task.followUp && task.followUp.trim()) {
          prompt += `\n  => ${task.followUp}`;
        }
        
        prompt += '\n';
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
      // 프로젝트/업무 섹션 이름 표시
      prompt += `◼ ${item.title}\n`;
      
      // 각 업무 항목을 하위 항목으로 표시
      item.tasks.forEach((task) => {
        if (task.description) {
          prompt += `- ${task.description}`;
          
          // 협업자 정보 추가
          if (task.collaborator && task.collaborator.trim()) {
            prompt += ` ${task.collaborator}`;
          }
          
          prompt += '\n';
          
          // 후속 조치는 > 형식으로 표시
          if (task.followUp && task.followUp.trim()) {
            prompt += `  > ${task.followUp}\n`;
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
  // 보고서 유형에 따른 제목 생성
  const reportTitle = data.reportType === 'morning' 
    ? '[금일 예정 업무]' 
    : '[금일 진행 업무]';
    
  // 지정된 형식에 맞는 출력 형식
  let result = `업무보고_ ${data.userName}\n`;
  result += `${formatDateForOutput(data.date)}\n`;
  result += '――――――――――――――\n';
  result += `${reportTitle}\n\n`;
  
  // 모든 프로젝트와 태스크를 지정된 형식으로 포맷팅
  result += formatPromptDataForTemplate(data);
  
  return result;
} 