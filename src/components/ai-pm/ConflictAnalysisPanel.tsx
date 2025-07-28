'use client';

import React, { useState } from 'react';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ConflictItem {
  type: 'content' | 'requirement' | 'design' | 'technical';
  description: string;
  conflictingDocument: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface ConflictAnalysisResult {
  hasConflicts: boolean;
  conflictLevel: 'none' | 'minor' | 'major' | 'critical';
  conflicts: ConflictItem[];
  recommendations: string[];
  summary: string;
}

interface ConflictAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: ConflictAnalysisResult | null;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  analyzedDocuments?: number;
  timestamp?: string;
  className?: string;
}

export default function ConflictAnalysisPanel({
  isOpen,
  onClose,
  analysisResult,
  isAnalyzing,
  onRunAnalysis,
  analyzedDocuments = 0,
  timestamp,
  className = ''
}: ConflictAnalysisPanelProps) {
  const [expandedConflict, setExpandedConflict] = useState<number | null>(null);

  // Get conflict level color and icon
  const getConflictLevelInfo = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: XCircleIcon,
          text: '심각한 충돌'
        };
      case 'major':
        return {
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          icon: ExclamationTriangleIcon,
          text: '주요 충돌'
        };
      case 'minor':
        return {
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: ExclamationTriangleIcon,
          text: '경미한 충돌'
        };
      default:
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: CheckCircleIcon,
          text: '충돌 없음'
        };
    }
  };

  // Get conflict type info
  const getConflictTypeInfo = (type: string) => {
    switch (type) {
      case 'content':
        return { text: '콘텐츠 충돌', color: 'bg-blue-100 text-blue-800' };
      case 'requirement':
        return { text: '요구사항 충돌', color: 'bg-purple-100 text-purple-800' };
      case 'design':
        return { text: '설계 충돌', color: 'bg-indigo-100 text-indigo-800' };
      case 'technical':
        return { text: '기술적 충돌', color: 'bg-gray-100 text-gray-800' };
      default:
        return { text: '기타 충돌', color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  const conflictLevelInfo = analysisResult ? getConflictLevelInfo(analysisResult.conflictLevel) : null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">AI 문서 충돌 분석</h2>
            {analysisResult && (
              <span className={`px-3 py-1 text-sm rounded-full border ${conflictLevelInfo?.color}`}>
                {conflictLevelInfo?.text}
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">문서 충돌 분석 중...</h3>
              <p className="text-gray-600 text-center">
                AI가 현재 문서와 기존 공식 문서들을 비교 분석하고 있습니다.
              </p>
            </div>
          ) : !analysisResult ? (
            <div className="flex flex-col items-center justify-center h-64">
              <DocumentTextIcon className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">문서 충돌 분석</h3>
              <p className="text-gray-600 text-center mb-6">
                현재 문서가 기존 공식 문서들과 충돌하는지 AI로 분석해보세요.
              </p>
              <button
                onClick={onRunAnalysis}
                className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                AI 충돌 분석 시작
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className={`p-4 rounded-lg border ${conflictLevelInfo?.color}`}>
                <div className="flex items-center gap-3 mb-3">
                  {conflictLevelInfo?.icon && (
                    <conflictLevelInfo.icon className="w-6 h-6" />
                  )}
                  <h3 className="text-lg font-semibold">분석 결과 요약</h3>
                </div>
                <p className="text-gray-700 mb-3">{analysisResult.summary}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>분석된 문서: {analyzedDocuments}개</span>
                  {timestamp && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {new Date(timestamp).toLocaleString('ko-KR')}
                    </span>
                  )}
                </div>
              </div>

              {/* Conflicts Section */}
              {analysisResult.hasConflicts && analysisResult.conflicts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                      감지된 충돌 ({analysisResult.conflicts.length}개)
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {analysisResult.conflicts.map((conflict, index) => {
                      const typeInfo = getConflictTypeInfo(conflict.type);
                      const severityColor = getSeverityColor(conflict.severity);
                      
                      return (
                        <div key={index} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${typeInfo.color}`}>
                                {typeInfo.text}
                              </span>
                              <span className={`text-sm font-medium ${severityColor}`}>
                                {conflict.severity === 'high' ? '높음' :
                                 conflict.severity === 'medium' ? '보통' : '낮음'}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => setExpandedConflict(
                                expandedConflict === index ? null : index
                              )}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              {expandedConflict === index ? '접기' : '자세히'}
                            </button>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-2">
                            {conflict.conflictingDocument}
                          </h4>
                          <p className="text-gray-700 mb-3">{conflict.description}</p>
                          
                          {expandedConflict === index && (
                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                              <div className="flex items-start gap-2">
                                <LightBulbIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <h5 className="font-medium text-blue-900 mb-1">해결 방안</h5>
                                  <p className="text-blue-800 text-sm">{conflict.suggestion}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations Section */}
              {analysisResult.recommendations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                      개선 제안
                    </h3>
                  </div>
                  
                  <div className="p-4">
                    <ul className="space-y-2">
                      {analysisResult.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-5 h-5 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* No Conflicts Message */}
              {!analysisResult.hasConflicts && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">충돌 없음</h3>
                  <p className="text-green-700">
                    현재 문서는 기존 공식 문서들과 충돌하지 않습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {analysisResult && !isAnalyzing && (
              <span>마지막 분석: {timestamp ? new Date(timestamp).toLocaleString('ko-KR') : '알 수 없음'}</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              닫기
            </button>
            
            {!isAnalyzing && (
              <button
                onClick={onRunAnalysis}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                다시 분석
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 