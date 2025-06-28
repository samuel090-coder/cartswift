
import { Button } from '@/components/ui/button';

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: 'all', label: 'All Items' },
  { id: 'Fashion', label: 'Fashion' },
  { id: 'Animals', label: 'Animals' },
  { id: 'Tools', label: 'Tools' },
  { id: 'Vehicles', label: 'Vehicles' },
  { id: 'Books', label: 'Books' },
];

const CategoryTabs = ({ selectedCategory, onCategoryChange }: CategoryTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-8 justify-center">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          onClick={() => onCategoryChange(category.id)}
          className="px-6 py-2"
        >
          {category.label}
        </Button>
      ))}
    </div>
  );
};

export default CategoryTabs;
