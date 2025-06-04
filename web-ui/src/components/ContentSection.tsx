interface ContentItem {
  content?: string;
  query?: string;
  url?: string;
  reliability?: number;
  relevanceScore?: number;
  createdAt: string;
}

interface ContentSectionProps {
  title: string;
  items: ContentItem[];
  type: 'text' | 'url' | 'relevance';
}

export function ContentSection({ title, items, type }: ContentSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-4">
      <h5 className="text-sm font-medium text-gray-900 flex items-center gap-2">
        {title}
        <span className="text-xs text-gray-500">({items.length})</span>
      </h5>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => {
          const date = new Date(item.createdAt).toLocaleTimeString();
          
          if (type === 'url') {
            return (
              <div key={index} className="text-sm flex items-center justify-between">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {new URL(item.url!).hostname}
                </a>
                {item.reliability !== undefined && (
                  <span className="text-gray-600">
                    Reliability: {(item.reliability * 100).toFixed(1)}%
                  </span>
                )}
                <span className="text-xs text-gray-500">{date}</span>
              </div>
            );
          }

          if (type === 'relevance') {
            return (
              <div key={index} className="text-sm">
                <p className="text-gray-600">{item.content}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    Relevance: {(item.relevanceScore! * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500">{date}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={index} className="text-sm">
              <p className="text-gray-600">
                {item.content || item.query}
              </p>
              <span className="text-xs text-gray-500">{date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
} 