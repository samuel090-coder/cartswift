import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Link as LinkIcon } from 'lucide-react';

export interface ExtractedProduct {
  title: string;
  description: string;
  price: number | null;
  currency: string;
  category: string;
  images: string[];
  source_url: string;
}

interface ProductExtractorProps {
  onExtracted: (data: ExtractedProduct) => void;
}

const ProductExtractor = ({ onExtracted }: ProductExtractorProps) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) {
      toast({ title: 'Enter a URL', description: 'Paste a product URL from any site.', variant: 'destructive' });
      return;
    }
    try {
      new URL(url);
    } catch {
      toast({ title: 'Invalid URL', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-product', {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Extraction failed');

      onExtracted(data.product);
      toast({
        title: '✨ Product extracted!',
        description: `Found "${data.product.title}" with ${data.product.images.length} image(s). Review and adjust before saving.`,
      });
      setUrl('');
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Extraction failed',
        description: e?.message || 'Could not extract product. Try a different URL.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 border-dashed border-2 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">AI Product Extractor</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Paste any product URL (Amazon, Shopify, AliExpress, etc.). AI will fill in title, description, price, and images automatically.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/product/..."
            className="pl-8"
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleExtract())}
          />
        </div>
        <Button onClick={handleExtract} disabled={loading} type="button">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {loading ? 'Extracting...' : 'Extract'}
        </Button>
      </div>
    </Card>
  );
};

export default ProductExtractor;
