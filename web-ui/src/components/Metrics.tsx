import { useEffect, useState } from 'react';
import type { SystemHealth, QueueMetrics } from '../types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsData {
  [key: string]: QueueMetrics[];
}

const queueNames = [
  'topic-queue',
  'question-queue',
  'reflection-queue',
  'clarification-queue',
  'query-preparation-queue',
  'search-queue',
  'crawl-queue',
  'review-queue',
  'completed-queue'
] as const;

type QueueName = typeof queueNames[number];

const formatQueueName = (name: QueueName) => {
  return name
    .replace('-queue', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function Metrics() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<MetricsData>({});

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3000/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setHealth(data.health);
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="container">
      {/* System Health */}
      <div className="card mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          System Health
        </h3>
        {health && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {queueNames.map(queueName => (
              <div key={queueName} className="card">
                <h4 className="text-gray-500 font-medium">
                  {formatQueueName(queueName)}
                </h4>
                <div className="mt-2 flex items-center">
                  <div className={`flex items-center ${health.queueHealth[queueName] === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="text-2xl font-medium">
                      {health.queueHealth[queueName] === 'healthy' ? '✓' : '✗'}
                    </span>
                    <span className="ml-2 text-sm font-medium">
                      {health.queueHealth[queueName].charAt(0).toUpperCase() + health.queueHealth[queueName].slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Queue Metrics */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900">
          Queue Metrics
        </h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {queueNames.map(queueName => {
            const queueLengthMetrics = metrics[`${queueName}_length`] || [];
            const processingTimeMetrics = metrics[`${queueName}_processing_time`] || [];

            return (
              <div key={queueName} className="card">
                <h4 className="text-gray-500 font-medium">
                  {formatQueueName(queueName)}
                </h4>
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Queue Length</h5>
                  <div className="chart-container">
                    <Line
                      data={{
                        labels: queueLengthMetrics.map(m => 
                          new Date(m.timestamp).toLocaleTimeString()
                        ),
                        datasets: [{
                          label: 'Queue Length',
                          data: queueLengthMetrics.map(m => m.value),
                          borderColor: 'rgb(79, 70, 229)',
                          tension: 0.1
                        }]
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Processing Time (ms)</h5>
                  <div className="chart-container">
                    <Line
                      data={{
                        labels: processingTimeMetrics.map(m => 
                          new Date(m.timestamp).toLocaleTimeString()
                        ),
                        datasets: [{
                          label: 'Processing Time',
                          data: processingTimeMetrics.map(m => m.value),
                          borderColor: 'rgb(59, 130, 246)',
                          tension: 0.1
                        }]
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 