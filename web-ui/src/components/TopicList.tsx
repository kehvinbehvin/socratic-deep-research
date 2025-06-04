import { useEffect, useState, useCallback } from 'react';
import type { Study } from '../types';
import { StageTimeline } from './StageTimeline';
import { ContentSection } from './ContentSection';

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
              <div className="text-sm text-gray-500">
                {new Date(study.createdAt).toLocaleString()}
              </div>
            </div>
            
            {study.error ? (
              <div className="mt-4 text-red-600">
                Error: {study.error}
              </div>
            ) : (
              <>
                <StageTimeline currentStage={study.stage} status={study.status} />

                <div className="mt-6 space-y-6">
                  {/* Questions and Initial Understanding */}
                  <div className="space-y-4">
                    <ContentSection
                      title="Questions"
                      items={study.questions}
                      type="text"
                    />
                    <ContentSection
                      title="Reflections"
                      items={study.reflections}
                      type="text"
                    />
                    <ContentSection
                      title="Clarifications Needed"
                      items={study.clarifications}
                      type="text"
                    />
                  </div>

                  {/* Research and Analysis */}
                  <div className="space-y-4">
                    <ContentSection
                      title="Search Queries"
                      items={study.queryPreparations}
                      type="text"
                    />
                    <ContentSection
                      title="Search Results"
                      items={study.searchResults}
                      type="url"
                    />
                    <ContentSection
                      title="Analyzed Sources"
                      items={study.crawlResults}
                      type="url"
                    />
                  </div>

                  {/* Insights */}
                  <ContentSection
                    title="Key Findings"
                    items={study.reviews}
                    type="relevance"
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 