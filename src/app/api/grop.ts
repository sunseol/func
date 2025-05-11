// grop API 연결을 위한 함수

export interface Project {
  id?: string;
  name: string;
  tasks: TaskItem[];
}

export interface TaskItem {
  id?: string;
  task?: string;
  description?: string;
  collaborator?: string;
  followUp?: string;
}

export interface ReportData {
  userName: string;
  date: string;
  projects: Project[];
  miscTasks: TaskItem[];
  reportType: 'morning' | 'evening' | 'weekly';
}

// 주간 보고서용 날짜 정보 생성 함수 (제목, 서브타이틀, 본문용)
function getWeeklyReportDateInfo(dateStr: string): { titleDate: string; subtitleDate: string; bodyDate: string; year: number, month: number, week: number } {
  try {
    let date: Date;
    if (dateStr.includes('T')) {
      date = new Date(dateStr);
    } else if (dateStr.match(/\d+\.\d+\.\d+\(.+\)/)) { // 예: 2023.10.27(금)
      const match = dateStr.match(/(\d+)\.(\d+)\.(\d+)/);
      if (!match) throw new Error('Invalid date format: YYYY.MM.DD(Day)');
      const [, year, month, day] = match;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (dateStr.match(/\d{4}-\d{2}-\d{2}\s.+요일/)) { // 예: 2025-05-12 월요일
      const datePart = dateStr.substring(0, 10); // 'YYYY-MM-DD' 부분만 추출
      // 로컬 타임존의 해당 날짜 자정으로 Date 객체 생성 시도
      // new Date(YYYY, MM-1, DD) 형식이 타임존 이슈를 피하는 데 더 안전할 수 있음
      const [year, month, day] = datePart.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      // 지원하지 않는 형식이거나 dateStr이 비어있는 경우 오늘 날짜 사용
      console.warn(`Unsupported date format or empty dateStr: "${dateStr}". Using current date.`);
      date = new Date(); 
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1월 = 1
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // 0=일, 1=월, ..., 6=토

    // 해당 주의 월요일 계산
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayDate = new Date(date);
    mondayDate.setDate(day + mondayOffset);

    // 해당 주의 금요일 계산
    const fridayDate = new Date(mondayDate);
    fridayDate.setDate(mondayDate.getDate() + 4);

    const startDay = mondayDate.getDate();
    const endDay = fridayDate.getDate();

    // 주차 계산 (해당 월의 몇 번째 주인지)
    const firstDayOfMonth = new Date(year, month - 1, 1);
    // 해당 월의 첫 번째 날의 요일 (0:일, 1:월 .. 6:토)
    const firstDayOfMonthWeekday = firstDayOfMonth.getDay();
    // 해당 월의 첫 번째 목요일이 속한 날짜 계산 (ISO 8601 주차 기준과 유사하게)
    const firstThursday = new Date(year, month - 1, 1 + ((4 - firstDayOfMonthWeekday + 7) % 7));
     // 해당 날짜가 속한 주의 목요일 계산
    const currentThursday = new Date(date);
    currentThursday.setDate(day + (4 - dayOfWeek));
    // 주차 계산 (첫 목요일 기준)
    const weekNumber = Math.ceil((currentThursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;


    // 월이 다른 경우 처리
    const startMonth = mondayDate.getMonth() + 1;
    const endMonth = fridayDate.getMonth() + 1;
    const bodyDateStr = (startMonth !== endMonth)
      ? `${year}년 ${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`
      : `${year}년 ${month}월 ${startDay}일 ~ ${endDay}일`;

    return {
      titleDate: `${year}년 ${month}월 ${weekNumber}주차`,
      subtitleDate: `${month}월 ${weekNumber}주차 업무목표`,
      bodyDate: `${month}월 ${weekNumber}주차 (${bodyDateStr})`,
      year: year,
      month: month,
      week: weekNumber
    };
  } catch (error) {
    console.error('주간 날짜 정보 생성 중 오류 발생:', error);
    // 오류 발생 시 기본값 반환
    const fallbackDate = new Date();
    const month = fallbackDate.getMonth() + 1;
    const week = Math.ceil(fallbackDate.getDate() / 7); // 간단한 주차 계산
    return {
      titleDate: `${fallbackDate.getFullYear()}년 ${month}월 ${week}주차`,
      subtitleDate: `${month}월 ${week}주차 업무목표`,
      bodyDate: `${month}월 ${week}주차 (날짜 계산 오류)`,
      year: fallbackDate.getFullYear(),
      month: month,
      week: week
    };
  }
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

    // 보고서 유형에 따른 내용 설정
    let systemPrompt = '';
    let userPrompt = '';
    let instructionFormat = '';
    let reportTitle = '';
    let reportSubtitle = '';
    let reportBodyDate = '';
    
    if (data.reportType === 'weekly') {
      const dateInfo = getWeeklyReportDateInfo(data.date);
      reportTitle = `주간계획서 (${dateInfo.titleDate})_${data.userName}`;
      reportSubtitle = dateInfo.subtitleDate;
      reportBodyDate = dateInfo.bodyDate;

      // 주간 보고서 프롬프트
      systemPrompt = `당신은 주간 업무 계획서를 작성하는 전문가입니다.
입력된 정보를 바탕으로 상세하고 구조화된 주간 계획서를 작성해 주세요.
각 프로젝트별로 주요 업무 내용을 그룹화하고, 세부 업무는 하위 항목으로 명확하게 정리해주세요.
제공된 형식(제목, 부제목, 본문 시작)을 엄격히 준수해야 합니다.
결과물을 그대로 복사하여 사용할 수 있도록 추가 설명 없이 보고서 본문만 출력해주세요.`;

      userPrompt = `다음 정보를 바탕으로 주간 업무 계획서를 작성해주세요:

입력 정보:
이름: ${data.userName}
기간: ${dateInfo.titleDate}
보고서 유형: 주간 계획서

${formatDetailedPromptData(data)}

출력 형식:
${reportTitle}

${reportSubtitle}

${reportBodyDate}
{각 프로젝트를 번호로 구분하여 정리}
1. 프로젝트명 (관련 주제1, 주제2)
{동일한 주제 아래 업무 그룹화}
주제명
- 세부 업무 내용
- 세부 업무 내용

2. 다음 프로젝트
{동일한 방식으로 구성}`;

      instructionFormat = `위 정보를 기반으로 주간 계획서를 작성해주세요. 다음 지침을 따라주세요:

1.  보고서의 제목은 '${reportTitle}' 이어야 합니다.
2.  부제목은 '${reportSubtitle}' 이어야 하며, 가운데 정렬된 것처럼 보이도록 줄바꿈 후 작성해주세요.
3.  본문은 '${reportBodyDate}' 로 시작해야 합니다.
4.  주간 업무 내용을 프로젝트별로 명확하게 구분하세요 (예: '1. 프로젝트명'). 프로젝트명 옆 괄호 안에는 관련된 주요 주제나 기능을 명시하세요.
5.  각 프로젝트 내에서 관련된 업무는 주제별로 그룹화하여 표시하세요 (예: '주제명').
6.  각 주제 아래의 세부 업무는 '-' 로 시작하여 명확하게 나열하세요.
7.  사용자가 제공한 업무 내용 외에 추가적인 내용을 생성하지 마세요. 주어진 내용만으로 구성하세요.
8.  결과는 오직 보고서 내용만 포함해야 하며, 프롬프트나 지시사항에 대한 언급은 절대 포함하지 마세요.

주간 계획서의 예시 형식:

${reportTitle}

${reportSubtitle}

${reportBodyDate}
1. 다독이 시스템 기획 (브랜딩, 커뮤니티, 기존페이지 수정)
브랜딩
- 브랜딩 페이지 구성요소 정의
- 브랜딩 페이지 UI/UX 설계
커뮤니티
- 다독이 커뮤니티 페이지 협업
- 커뮤니티 페이지, 내서재, 마이페이지 연계점 반영하여 논의 후 수정 작업
마이페이지, 내서재 추가 사항 수정
- 각 페이지 별로 추가 되어야 할 설명 수정
- 고객센터, 약관페이지 수정 (다른 페이지에서 문의하기로 넘어와야하는 부분 체크)
- 내서재 책장 공유 기능 상세 정의(공유되는 형태, SNS별로 어떤 내용을 전달될지 등)
2. AI 서비스 기능 기획 (중장기 방향, 요구사항 정의, 베트남 협업)
AI 기능 기획 중장기 방향 피드백 반영하여 수정
- AI 서비스 별 요구사항(개발 자원, 인력 등) 추정
- 베트남 AI 엔지니어 작업 확인(작업 수준에 맞춘 세부일정 논의)`;
    } else if (data.reportType === 'morning') {
      // 아침 보고서 프롬프트
      systemPrompt = `당신은 프로젝트별 업무 내용을 특정 형식의 일간 보고서로 변환하는 비서입니다. 
입력된 정보를 바탕으로 정확히 지정된 형식에 맞게 일간 보고서를 작성해주세요. 
주어진 정보를 바탕으로 부족한 부분이 있다면 합리적으로 추가 내용을 포함할 수 있습니다. 
단, 기본 형식은 반드시 유지하세요. 
결과물을 그대로 복사하여 사용할 수 있도록 추가 설명 없이 보고서만 출력해주세요.
보고서 유형은 '출근 보고서(금일 예정 업무)' 입니다.`;

      userPrompt = `다음 정보를 바탕으로 아래 형식에 맞게 일간 업무 보고서를 작성해주세요:

입력 정보:
이름: ${data.userName}
날짜: ${data.date}
보고서 유형: 출근 보고서(금일 예정 업무)
${formatPromptData(data)}

출력 형식:
업무보고_ ${data.userName}
${formatDateForOutput(data.date)}
――――――――――――――   
[금일 예정 업무]

${formatPromptDataForTemplate(data)}`;

      instructionFormat = `위 정보를 기반으로 보고서를 작성해주세요. 필요하다면 합리적인 범위 내에서 다음과 같은 내용을 추가할 수 있습니다:
1. 태스크의 세부 사항 확장
2. 업무 관련된 추가 세부 정보
3. 회의에 참석하는 경우 간단한 아젠다
4. 시작 예정인 업무에 대한 간략한 목표나 기대 결과
5. 필요한 자원이나 협업자에 대한 언급

단, 모든 추가 정보는 실제 있을법한 자연스러운 내용이어야 하며, 주어진 형식을 철저히 지켜야 합니다.
프롬프트 또는 지시사항에 대한 언급은 결과에 포함하지 마세요. 오직 보고서 내용만 출력하세요.`;
    } else {
      // 저녁 보고서 프롬프트
      systemPrompt = `당신은 프로젝트별 업무 내용을 특정 형식의 일간 보고서로 변환하는 비서입니다. 
입력된 정보를 바탕으로 정확히 지정된 형식에 맞게 일간 보고서를 작성해주세요. 
주어진 정보를 바탕으로 부족한 부분이 있다면 합리적으로 추가 내용을 포함할 수 있습니다. 
단, 기본 형식은 반드시 유지하세요. 
결과물을 그대로 복사하여 사용할 수 있도록 추가 설명 없이 보고서만 출력해주세요.
보고서 유형은 '퇴근 보고서(금일 진행 업무)' 입니다.`;

      userPrompt = `다음 정보를 바탕으로 아래 형식에 맞게 일간 업무 보고서를 작성해주세요:

입력 정보:
이름: ${data.userName}
날짜: ${data.date}
보고서 유형: 퇴근 보고서(금일 진행 업무)
${formatPromptData(data)}

출력 형식:
업무보고_ ${data.userName}
${formatDateForOutput(data.date)}
――――――――――――――   
[금일 진행 업무]

${formatPromptDataForTemplate(data)}`;

      instructionFormat = `위 정보를 기반으로 보고서를 작성해주세요. 필요하다면 합리적인 범위 내에서 다음과 같은 내용을 추가할 수 있습니다:
1. 태스크의 세부 사항 확장
2. 업무 관련된 추가 세부 정보
3. 업무가 완료된 경우 결과나 성과에 대한 간단한 설명
4. 회의에 참석한 경우 주요 논의 내용
5. 추후 진행 예정인 관련 업무에 대한 언급

단, 모든 추가 정보는 실제 있을법한 자연스러운 내용이어야 하며, 주어진 형식을 철저히 지켜야 합니다.
프롬프트 또는 지시사항에 대한 언급은 결과에 포함하지 마세요. 오직 보고서 내용만 출력하세요.`;
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
          // model: "llama3-8b-8192", // 다른 모델 사용 가능 시
          model: "meta-llama/llama-4-scout-17b-16e-instruct", // llama-4-scout 모델 대신 llama3 사용 시도
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            },
            // {
            //   role: "assistant",
            //   content: "이해했습니다. 주어진 정보를 바탕으로 보고서를 작성하겠습니다."
            // }, // Assistant 턴 제거 시도
            {
              role: "user",
              content: instructionFormat
            }
          ],
          temperature: 0.3, // 약간 낮춰서 형식 준수 유도
          max_tokens: 2000, // 주간 보고서는 내용이 길 수 있으므로 늘림
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('GROQ API Error:', response.status, errorBody);
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      // API 응답 구조 확인 및 필요시 조정
      if (result.choices && result.choices.length > 0 && result.choices[0].message) {
           // 주간 보고서의 경우, 제목/부제목 줄바꿈 보정
           let reportContent = result.choices[0].message.content;
           if (data.reportType === 'weekly') {
               // 부제목 앞에 줄바꿈 추가 (가운데 정렬 효과)
               reportContent = reportContent.replace(reportSubtitle, `\n${reportSubtitle}\n`);
               // 본문 시작 날짜 앞에도 줄바꿈 추가
               reportContent = reportContent.replace(reportBodyDate, `\n${reportBodyDate}\n`);
           }
           return reportContent;
      } else {
           console.error('Unexpected API response structure:', result);
           throw new Error('API 응답 구조가 예상과 다릅니다.');
      }
    } catch (error) {
      console.error('GROQ API 호출 중 오류 발생:', error);
      return formatDefaultReport(data); // API 실패 시 기본 포맷 반환
    }
  } catch (error) {
    console.error('보고서 생성 중 오류가 발생했습니다:', error);
    return formatDefaultReport(data); // 전체 함수 실패 시 기본 포맷 반환
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

// 주간 보고서용 월/주차 형식 날짜 변환
// function formatMonthWeekDate(dateStr: string): string { // 이 함수는 getWeeklyReportDateInfo 로 대체됨
//   try {
//     // ISO 날짜 문자열이나 다른 형식의 날짜 문자열을 Date 객체로 변환
//     let date: Date;
    
//     if (dateStr.includes('T')) {
//       // ISO 형식 (YYYY-MM-DDTHH:MM:SS.sssZ)
//       date = new Date(dateStr);
//     } else if (dateStr.match(/\\d+\\.\\d+\\.\\d+\\(.+\\)/)) {
//       // YYYY.MM.DD(요일) 형식
//       const match = dateStr.match(/(\\d+)\\.(\\d+)\\.(\\d+)/);
//       if (!match) return dateStr;
      
//       const [, year, month, day] = match;
//       date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
//     } else {
//       // 다른 형식이거나 파싱 실패 시 현재 날짜 사용
//       date = new Date();
//     }
    
//     const year = date.getFullYear();
//     const month = date.getMonth() + 1;
    
//     // 이번 주의 시작일(월요일)과 종료일(금요일) 계산
//     const day = date.getDate();
//     const dayOfWeek = date.getDay(); // 0=일, 1=월, 2=화, ..., 6=토
    
//     // 현재 날짜가 속한 주의 월요일 날짜 계산
//     const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 일요일이면 전 주 월요일로
//     const mondayDate = new Date(date);
//     mondayDate.setDate(day + mondayOffset);
    
//     // 현재 날짜가 속한 주의 금요일 날짜 계산
//     const fridayDate = new Date(mondayDate);
//     fridayDate.setDate(mondayDate.getDate() + 4);
    
//     const startDay = mondayDate.getDate();
//     const endDay = fridayDate.getDate();
    
//     // 주차 계산 (대략적인 방법)
//     // 월의 첫 날짜
//     const firstDayOfMonth = new Date(year, month - 1, 1);
//     // 월의 첫 번째 월요일 찾기
//     const firstMondayOffset = (8 - firstDayOfMonth.getDay()) % 7;
//     const firstMonday = new Date(firstDayOfMonth);
//     firstMonday.setDate(1 + firstMondayOffset);
    
//     // 해당 날짜가 몇 번째 주인지 계산
//     const weekNumber = Math.ceil((mondayDate.getDate() - firstMonday.getDate() + 1) / 7) + 1;
    
//     // 월이 다른 경우 처리
//     if (mondayDate.getMonth() !== fridayDate.getMonth()) {
//       const startMonth = mondayDate.getMonth() + 1;
//       const endMonth = fridayDate.getMonth() + 1;
//       return \`\${month}월 \${weekNumber}주차 (\${year}년 \${startMonth}월 \${startDay}일 ~ \${endMonth}월 \${endDay}일)\`;
//     }
    
//     return \`\${month}월 \${weekNumber}주차 (\${year}년 \${month}월 \${startDay}일 ~ \${endDay}일)\`;
//   } catch (error) {
//     console.error('주간 날짜 포맷 변환 중 오류 발생:', error);
//     return dateStr;
//   }
// }

// 주간 보고서용 상세 포맷팅 함수 (본문 양식 변경)
function formatDetailedPromptData(data: ReportData): string {
  let prompt = "주요 업무 내용:\n";
  
  // 프로젝트별 업무를 보고서 양식에 맞게 포맷팅
  data.projects.forEach((project, projectIdx) => {
    // 프로젝트 이름과 유효한 태스크가 있는지 확인
    if (project.name && project.tasks.length > 0 && project.tasks.some(t => t.description)) {
      // 프로젝트 번호와 이름, 관련 주제 추출 및 포맷팅
      const topics = new Set<string>();
      project.tasks.forEach(task => {
         // "주제 - 내용" 형식에서 주제 추출
         const match = task.description?.match(/^(.+?)\s*-\s*(.+)$/);
         if (match) {
           topics.add(match[1].trim());
         }
      });
      const topicsStr = topics.size > 0 ? ` (${Array.from(topics).join(', ')})` : '';
      prompt += `${projectIdx + 1}. ${project.name}${topicsStr}\n`;

      // 주제별로 태스크 그룹화
      const tasksByGroup: { [key: string]: { description: string; collaborator?: string }[] } = {};
      project.tasks.forEach((task) => {
        if (task.description) {
          const match = task.description.match(/^(.+?)\s*-\s*(.+)$/);
          if (match) {
            const [, groupName, taskDesc] = match;
            const trimmedGroupName = groupName.trim();
            if (!tasksByGroup[trimmedGroupName]) {
              tasksByGroup[trimmedGroupName] = [];
            }
            tasksByGroup[trimmedGroupName].push({
              description: taskDesc.trim(),
              collaborator: task.collaborator
            });
          } else {
             // 그룹이 없는 경우 "일반" 또는 프로젝트 이름 등으로 그룹화하거나 그대로 표시
             const defaultGroup = "기타"; // 또는 project.name 사용
             if (!tasksByGroup[defaultGroup]) {
               tasksByGroup[defaultGroup] = [];
             }
             tasksByGroup[defaultGroup].push({
                description: task.description.trim(),
                collaborator: task.collaborator
             });
          }
        }
      });
      
      // 그룹별 태스크 출력
      Object.entries(tasksByGroup).forEach(([groupName, tasks]) => {
        // 그룹명이 "기타"가 아닐 경우 또는 기타 그룹에만 태스크가 있는 경우 그룹명 출력
        if (groupName !== "기타" || Object.keys(tasksByGroup).length === 1) {
           prompt += `${groupName}\n`;
        }
        tasks.forEach(gt => {
          prompt += `- ${gt.description}`;
          if (gt.collaborator && gt.collaborator.trim()) {
            prompt += ` (${gt.collaborator.trim()})`; // 협업자는 괄호 안에 표시
          }
          prompt += '\n';
          // 주간 보고서에서는 후속 조치(followUp)는 표시하지 않음
        });
      });
      
      prompt += '\n'; // 프로젝트 간 구분
    }
  });
  
  // 기타 업무가 있으면 추가 (주간 보고서에서는 기타 업무 섹션 제외 가능성 있음 - 요구사항 재확인 필요)
  // 여기서는 일단 기존 로직 유지하되, 포맷만 맞춤
  if (data.miscTasks.length > 0 && data.miscTasks.some(task => task.description)) {
    const projectCount = data.projects.filter(p => p.name && p.tasks.length > 0 && p.tasks.some(t => t.description)).length;
    const number = projectCount + 1;
    
    prompt += `${number}. 기타 업무\n`; // 기타 업무도 번호 매기기
    
    data.miscTasks.forEach((task) => {
      if (task.description) {
        prompt += `- ${task.description}`;
        if (task.collaborator && task.collaborator.trim()) {
          prompt += ` (${task.collaborator.trim()})`;
        }
        prompt += '\n';
        // 주간 보고서에서는 후속 조치(followUp)는 표시하지 않음
      }
    });
    prompt += '\n';
  }
  
  return prompt.trim(); // 마지막 줄바꿈 제거
}


// API 연결 없을 때 기본 포맷팅 적용 (export 추가)
export function formatDefaultReport(data: ReportData): string {
  if (data.reportType === 'weekly') {
    const dateInfo = getWeeklyReportDateInfo(data.date);
    let result = `주간계획서 (${dateInfo.titleDate})_${data.userName}\n\n`; // 제목
    result += `${dateInfo.subtitleDate}\n\n`; // 부제목
    result += `${dateInfo.bodyDate}\n`; // 본문 시작 날짜

    // 상세 데이터 포맷팅 함수를 재사용하여 본문 생성
    result += formatDetailedPromptData(data);

    return result;
  } else {
    // 일간 보고서용 기본 포맷
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
}

