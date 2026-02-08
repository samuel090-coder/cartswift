import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: 'all', label: '✨ All', emoji: '' },
  { id: 'Fashion', label: '👗 Fashion', emoji: '' },
  { id: 'Animals', label: '🐾 Animals', emoji: '' },
  { id: 'Tools', label: '🔧 Tools', emoji: '' },
  { id: 'Vehicles', label: '🚗 Vehicles', emoji: '' },
  { id: 'Books', label: '📚 Books', emoji: '' },
  { id: 'APK/File', label: '📱 APK/File', emoji: '' },
];

const CategoryTabs = ({ selectedCategory, onCategoryChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant="ghost"
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border",
            selectedCategory === category.id
              ? "bg-primary text-primary-foreground border-primary shadow-lg"
              : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground hover:border-border"
          )}
          style={selectedCategory === category.id ? { boxShadow: 'var(--shadow-glow-primary)' } : undefined}
        >
          {category.label}
        </Button>
      ))}
    </div>
  );
};

export default CategoryTabs;
