import { useState } from 'react';

export function TopicForm() {
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with topic:', topic);
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/api/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: topic
         }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to submit topic: ${response.status} ${response.statusText}`);
      }

      setTopic('');
    } catch (error) {
      console.error('Error details:', error);
      alert('Failed to submit topic. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card mb-4">
      <h3 className="text-lg font-medium text-gray-900">
        Start Socratic Learning
      </h3>
      <div className="mt-2">
        <p className="text-gray-500">Enter a topic you'd like to explore through the Socratic method. The system will guide you through questions, reflections, and research.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="input"
            placeholder="Enter your topic"
            required
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="button button-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Start Learning'}
          </button>
        </div>
      </form>
    </div>
  );
} 