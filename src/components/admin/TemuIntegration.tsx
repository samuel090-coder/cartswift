import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Download, Trash2, ExternalLink, Star } from 'lucide-react';

interface TemuProduct {
  id: string;
  temu_product_id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  currency: string;
  discount_percentage: number | null;
  images: string[] | null;
  temu_category: string | null;
  mapped_category: string;
  rating: number | null;
  review_count: number | null;
  temu_url: string | null;
  sales_count: number | null;
  imported_to_items: boolean;
  items_id: string | null;
}

const TemuIntegration = () => {
  const [products, setProducts] = useState<TemuProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Global');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadProducts();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('temu_api_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setRegion(data.region || 'Global');
      setLastSync(data.last_sync_at);
    } else {
      // Seed default row
      await supabase.from('temu_api_settings').insert({ region: 'Global' });
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('temu_products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      toast({ title: 'Failed to load products', description: error.message, variant: 'destructive' });
    } else {
      setProducts((data as TemuProduct[]) || []);
    }
    setLoading(false);
  };

  const syncFromTemu = async (mode: 'auto' | 'mock' = 'auto') => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('temu-fetch-products', {
        body: { query, limit: 20, mode },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');
      toast({
        title: data.usedMock ? 'Sample products loaded' : 'Synced from Temu',
        description: `${data.count} products${data.usedMock ? ' (mock mode — add Temu API keys to fetch real products)' : ''}`,
      });
      await loadProducts();
      await loadSettings();
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const importProduct = async (p: TemuProduct) => {
    setImporting(p.id);
    try {
      const { data: inserted, error } = await supabase
        .from('items')
        .insert({
          title: p.title,
          description: p.description || '',
          price: p.price,
          currency: p.currency,
          discount_percentage: p.discount_percentage,
          images: p.images || [],
          category: p.mapped_category as any,
          star_rating: p.rating,
          item_type: 'physical',
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from('temu_products')
        .update({ imported_to_items: true, items_id: inserted.id })
        .eq('id', p.id);

      toast({ title: 'Imported', description: `"${p.title}" added to your store` });
      loadProducts();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(null);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Remove this Temu product from your cache?')) return;
    const { error } = await supabase.from('temu_products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const updateRegion = async (newRegion: string) => {
    setRegion(newRegion);
    await supabase
      .from('temu_api_settings')
      .update({ region: newRegion })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    toast({ title: 'Region updated', description: newRegion });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/80 border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-amber-300 flex items-center gap-2">
            🛍️ Temu Integration
            <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-300">
              {region}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400">
            Fetch trending products from the Temu marketplace and import them into your store.
            Add <code className="text-amber-300">TEMU_APP_KEY</code>,{' '}
            <code className="text-amber-300">TEMU_APP_SECRET</code>, and{' '}
            <code className="text-amber-300">TEMU_ACCESS_TOKEN</code> as secrets to enable live API
            mode. Without them, the integration runs in mock mode for testing.
          </p>

          <div className="flex flex-wrap gap-2">
            {(['US', 'EU', 'Global'] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={region === r ? 'default' : 'outline'}
                onClick={() => updateRegion(r)}
                className={
                  region === r
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'border-amber-500/40 text-amber-300 hover:bg-amber-950/50'
                }
              >
                {r}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Search keyword (e.g., 'wireless earbuds')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-slate-800 border-amber-500/30 text-amber-100"
            />
            <Button
              onClick={() => syncFromTemu('auto')}
              disabled={syncing}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2 hidden sm:inline">Sync</span>
            </Button>
            <Button
              onClick={() => syncFromTemu('mock')}
              disabled={syncing}
              variant="outline"
              className="border-amber-500/40 text-amber-300 hover:bg-amber-950/50"
            >
              Demo
            </Button>
          </div>

          {lastSync && (
            <p className="text-xs text-slate-500">
              Last sync: {new Date(lastSync).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-amber-300 font-semibold mb-3">
          Cached Products ({products.length.toLocaleString()})
        </h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : products.length === 0 ? (
          <Card className="bg-slate-900/50 border-amber-500/10">
            <CardContent className="py-8 text-center text-slate-500">
              No products yet. Click <strong className="text-amber-300">Sync</strong> or{' '}
              <strong className="text-amber-300">Demo</strong> to load products.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} className="bg-slate-900/80 border-amber-500/20 overflow-hidden">
                {p.images?.[0] && (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                )}
                <CardContent className="p-3 space-y-2">
                  <h4 className="text-sm font-medium text-amber-100 line-clamp-2">{p.title}</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-bold">
                        {p.currency} {Number(p.price).toLocaleString()}
                      </span>
                      {p.original_price && p.original_price > p.price && (
                        <span className="ml-2 text-xs text-slate-500 line-through">
                          {Number(p.original_price).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {p.rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-300">
                        <Star className="w-3 h-3 fill-current" />
                        {p.rating}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-300/80 text-xs">
                      {p.mapped_category}
                    </Badge>
                    {p.sales_count != null && (
                      <span>{p.sales_count.toLocaleString()} sold</span>
                    )}
                  </div>

                  <div className="flex gap-1 pt-1">
                    <Button
                      size="sm"
                      onClick={() => importProduct(p)}
                      disabled={p.imported_to_items || importing === p.id}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white h-8 text-xs"
                    >
                      {importing === p.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : p.imported_to_items ? (
                        '✓ Imported'
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1" />
                          Import
                        </>
                      )}
                    </Button>
                    {p.temu_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="border-amber-500/40 text-amber-300 hover:bg-amber-950/50 h-8 px-2"
                      >
                        <a href={p.temu_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteProduct(p.id)}
                      className="border-red-500/40 text-red-400 hover:bg-red-950/50 h-8 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemuIntegration;
