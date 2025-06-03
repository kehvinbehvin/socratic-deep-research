import { useEffect, useState, useCallback } from 'react';
import type { Study, StudyStage } from '../types';

export function TopicList() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [wsRetryCount, setWsRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket('ws://localhost:3000');

    ws.onmessage = (event) => {
      const study = JSON.parse(event.data);
      setStudies(prevStudies => {
        const index = prevStudies.findIndex(t => t.id === study.id);
        if (index >= 0) {
          const newStudies = [...prevStudies];
          newStudies[index] = study;
          return newStudies;
        }
        return [study, ...prevStudies];
      });
    };

    ws.onclose = () => {
      if (wsRetryCount < MAX_RETRIES) {
        setTimeout(() => {
          setWsRetryCount(prev => prev + 1);
          connectWebSocket();
        }, 1000 * Math.pow(2, wsRetryCount)); // Exponential backoff
      }
    };

    return ws;
  }, [wsRetryCount]);

  useEffect(() => {
    fetchStudies();
    const ws = connectWebSocket();
    return () => ws.close();
  }, [connectWebSocket]);

  const fetchStudies = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/study');
      if (!response.ok) {
        throw new Error('Failed to fetch studies');
      }
      const data = await response.json();
      setStudies(data);
    } catch (error) {
      console.error('Error fetching studies:', error);
    }
  };

  const getStageNumber = (stage: StudyStage): number => {
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
    return stages.indexOf(stage);
  };

  const getStatusBadgeClass = (stage: StudyStage) => {
    switch (stage) {
      case 'COMPLETED':
        return 'status-badge-completed';
      case 'FAILED':
        return 'status-badge-failed';
      default:
        return 'status-badge-in-progress';
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Learning Sessions
      </h3>
      <div className="flex flex-col gap-4">
        {studies.map((study) => (
          <div key={study.id} className="card">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">{study.topic}</h4>
              <span className={`status-badge ${getStatusBadgeClass(study.stage)}`}>
                {study.stage.replace(/_/g, ' ')}
              </span>
            </div>
            
            {study.error ? (
              <div className="mt-4 text-red-600">
                Error: {study.error}
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <div className="flex mb-2 items-center justify-between">
                    <span className="text-gray-500 text-sm font-medium">
                      Progress
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      style={{ width: `${(getStageNumber(study.stage) / 8) * 100}%` }}
                      className="progress-bar-fill"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {study.questions && study.questions.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Questions:</h5>
                      <ul className="mt-1 list-disc list-inside text-gray-600">
                        {study.questions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {study.reflections && study.reflections.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Reflections:</h5>
                      <ul className="mt-1 list-disc list-inside text-gray-600">
                        {study.reflections.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {study.clarifications && study.clarifications.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Clarifications:</h5>
                      <ul className="mt-1 list-disc list-inside text-gray-600">
                        {study.clarifications.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {study.searchResults && study.searchResults.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Search Results:</h5>
                      <div className="mt-1 space-y-2">
                        {study.searchResults.map((result, i) => (
                          <div key={i} className="text-sm">
                            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {result.title}
                            </a>
                            <p className="text-gray-600">{result.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {study.crawlResults && study.crawlResults.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Source Reliability:</h5>
                      <div className="mt-1 space-y-2">
                        {study.crawlResults.map((result, i) => (
                          <div key={i} className="text-sm flex items-center justify-between">
                            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {new URL(result.url).hostname}
                            </a>
                            <span className="text-gray-600">
                              Reliability: {(result.reliability * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {study.reviewResults && study.reviewResults.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">Key Findings:</h5>
                      <div className="mt-1 space-y-2">
                        {study.reviewResults
                          .sort((a, b) => b.relevanceScore - a.relevanceScore)
                          .slice(0, 3)
                          .map((result, i) => (
                            <div key={i} className="text-sm">
                              <p className="text-gray-600">{result.content}</p>
                              <span className="text-xs text-gray-500">
                                Relevance: {(result.relevanceScore * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 