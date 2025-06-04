import type { StudyStage } from '../types';

interface StageTimelineProps {
  currentStage: StudyStage;
  status: 'pending' | 'processing' | 'completed' | 'clean_up' | 'failed';
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
  
  // Calculate progress based on both stage and status
  const getProgress = () => {
    if (status === 'failed') return currentIndex / stages.length * 100;
    if (status === 'completed') return 100;
    if (status === 'processing') {
      return ((currentIndex + 0.5) / stages.length) * 100;
    }
    return (currentIndex / stages.length) * 100;
  };

  // Get appropriate status badge class
  const getStatusBadgeClass = () => {
    switch (status) {
      case 'completed':
        return 'status-badge-completed';
      case 'failed':
        return 'status-badge-failed';
      case 'processing':
        return 'status-badge-in-progress';
      default:
        return 'status-badge-pending';
    }
  };

  // Get stage display text
  const getStageDisplay = () => {
    if (status === 'completed') return 'COMPLETED';
    if (status === 'failed') return 'FAILED';
    return currentStage.replace(/_/g, ' ');
  };

  return (
    <div className="mt-4">
      <div className="flex mb-2 items-center justify-between">
        <span className="text-gray-500 text-sm font-medium">Learning Progress</span>
        <span className={`status-badge ${getStatusBadgeClass()}`}>
          {getStageDisplay()}
        </span>
      </div>
      <div className="relative">
        <div className="progress-bar">
          <div
            style={{ width: `${getProgress()}%` }}
            className="progress-bar-fill"
          />
        </div>
        <div className="flex justify-between mt-2">
          {stages.map((stage, index) => (
            <div
              key={stage}
              className={`w-2 h-2 rounded-full ${
                index < currentIndex || (index === currentIndex && status !== 'pending')
                  ? 'bg-indigo-600'
                  : 'bg-gray-200'
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
                index < currentIndex || (index === currentIndex && status !== 'pending')
                  ? 'text-indigo-600'
                  : 'text-gray-400'
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