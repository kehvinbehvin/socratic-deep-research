import type { StudyStage } from '../types';

interface StageTimelineProps {
  currentStage: StudyStage;
  status: string;
}

const stages: StudyStage[] = [
  'TOPIC',
  'QUESTION',
  'REFLECTION',
  'CLARIFICATION',
  'QUERY_PREPARATION',
  'SEARCH',
  'CRAWL',
  'REVIEW',
  'COMPLETED'
];

export function StageTimeline({ currentStage, status }: StageTimelineProps) {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="mt-4">
      <div className="flex mb-2 items-center justify-between">
        <span className="text-gray-500 text-sm font-medium">Learning Progress</span>
        <span className={`status-badge ${status === 'FAILED' ? 'status-badge-failed' : 'status-badge-in-progress'}`}>
          {currentStage.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="relative">
        <div className="progress-bar">
          <div
            style={{ width: `${((currentIndex + 1) / stages.length) * 100}%` }}
            className="progress-bar-fill"
          />
        </div>
        <div className="flex justify-between mt-2">
          {stages.map((stage, index) => (
            <div
              key={stage}
              className={`w-2 h-2 rounded-full ${
                index <= currentIndex ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
              style={{ transform: 'translateX(-50%)' }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {stages.map((stage, index) => (
            <span
              key={stage}
              className={`text-xs ${
                index <= currentIndex ? 'text-indigo-600' : 'text-gray-400'
              }`}
              style={{
                transform: 'translateX(-50%) rotate(-45deg)',
                transformOrigin: 'top left',
                fontSize: '0.65rem'
              }}
            >
              {stage.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
} 