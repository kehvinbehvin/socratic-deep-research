import { useEffect, useState } from 'react';
import type { Study } from '../types';
import { StageTimeline } from './StageTimeline';
import { ContentSection } from './ContentSection';

export function TopicList() {
  const [studies, setStudies] = useState<Study[]>([]);

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

  useEffect(() => {
    // Initial fetch
    fetchStudies();

    // Set up polling every 5 seconds
    const pollInterval = setInterval(fetchStudies, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, []);

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