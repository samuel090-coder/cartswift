
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ExpandableDescriptionProps {
  description: string;
  maxLines?: number;
}

const ExpandableDescription = ({ description, maxLines = 2 }: ExpandableDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) return null;

  // Estimate if text needs truncation (rough estimation)
  const words = description.split(' ');
  const estimatedLinesNeeded = Math.ceil(words.length / 8); // rough estimate of 8 words per line
  const needsTruncation = estimatedLinesNeeded > maxLines;

  const truncatedText = needsTruncation && !isExpanded 
    ? words.slice(0, maxLines * 8).join(' ') + '...'
    : description;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 leading-relaxed">
        {truncatedText}
      </p>
      {needsTruncation && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal"
        >
          {isExpanded ? 'See Less' : 'See More'}
        </Button>
      )}
    </div>
  );
};

export default ExpandableDescription;
