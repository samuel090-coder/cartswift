import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Sparkles, Pencil, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const CHUNK_SIZE = 6;

type Listing = {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
  posted?: boolean;
  posting?: boolean;
};

const CATEGORIES = ['fashion', 'books', 'tools', 'vehicles', 'animals'];

const BulkProductPoster = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [postingAll, setPostingAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `bulk/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('item-images').upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from('item-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      toast.success(`Uploaded ${urls.length} image(s). Analyzing...`);
      setAnalyzing(true);
      const { data, error } = await supabase.functions.invoke('ai-bulk-detect-products', {
        body: { imageUrls: urls },
      });
      if (error) throw error;
      if (!data?.listings?.length) {
        toast.error('AI could not detect any products. Try clearer images.');
      } else {
        setListings((prev) => [...prev, ...data.listings]);
        toast.success(`Detected ${data.listings.length} product(s)`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to process images');
    } finally {
      setUploading(false);
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const postOne = async (idx: number): Promise<boolean> => {
    const l = listings[idx];
    if (!l || l.posted) return false;
    setListings((prev) => prev.map((x, i) => i === idx ? { ...x, posting: true } : x));
    try {
      const { error } = await supabase.from('items').insert({
        title: l.title,
        description: l.description,
        category: l.category as any,
        price: l.price,
        currency: l.currency || 'USD',
        images: l.images,
      });
      if (error) throw error;
      setListings((prev) => prev.map((x, i) => i === idx ? { ...x, posted: true, posting: false } : x));
      return true;
    } catch (e: any) {
      toast.error(`"${l.title}" failed: ${e.message}`);
      setListings((prev) => prev.map((x, i) => i === idx ? { ...x, posting: false } : x));
      return false;
    }
  };

  const postAll = async () => {
    setPostingAll(true);
    let ok = 0;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].posted) continue;
      const success = await postOne(i);
      if (success) ok++;
    }
    setPostingAll(false);
    if (ok > 0) toast.success(`Posted ${ok} product(s) to the site!`);
  };

  const removeListing = (idx: number) => {
    setListings((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateListing = (idx: number, patch: Partial<Listing>) => {
    setListings((prev) => prev.map((x, i) => i === idx ? { ...x, ...patch } : x));
  };

  const pendingCount = listings.filter((l) => !l.posted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-amber-500" /> AI Bulk Product Poster
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload any number of product images. AI groups same products, splits different ones, and writes title, description and price for each.
          </p>
        </div>
        {pendingCount > 0 && (
          <Button
            onClick={postAll}
            disabled={postingAll}
            className="bg-gradient-to-r from-amber-500 to-amber-700 text-white"
          >
            {postingAll ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={16} />}
            Post All ({pendingCount})
          </Button>
        )}
      </div>

      <Card className="border-dashed border-2 border-amber-500/30 bg-slate-900/40">
        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || analyzing}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {uploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload className="mr-2" size={18} />}
            {uploading ? 'Uploading...' : analyzing ? 'AI analyzing...' : 'Upload Product Images'}
          </Button>
          <p className="text-xs text-muted-foreground">Select multiple images at once</p>
        </CardContent>
      </Card>

      {analyzing && (
        <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
          <Loader2 className="animate-spin" size={16} /> AI is detecting and grouping products...
        </div>
      )}

      {listings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((l, idx) => (
            <Card key={idx} className={l.posted ? 'opacity-60 border-green-500/40' : 'border-amber-500/20'}>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2 overflow-x-auto">
                  {l.images.map((src, i) => (
                    <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded flex-shrink-0" />
                  ))}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold flex-1">{l.title}</h3>
                  <Badge variant="outline">{l.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{l.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-amber-500">${l.price.toLocaleString()}</span>
                  {l.posted && <Badge className="bg-green-600">Posted</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditIndex(idx)} disabled={l.posted}>
                    <Pencil size={14} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" onClick={() => postOne(idx)} disabled={l.posted || l.posting}>
                    {l.posting ? <Loader2 className="animate-spin mr-1" size={14} /> : <Send size={14} className="mr-1" />}
                    Post
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeListing(idx)} className="text-red-500 ml-auto">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editIndex !== null} onOpenChange={(o) => !o && setEditIndex(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editIndex !== null && listings[editIndex] && (
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto">
                {listings[editIndex].images.map((src, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={src} alt="" className="w-20 h-20 object-cover rounded" />
                    <button
                      onClick={() => updateListing(editIndex, { images: listings[editIndex].images.filter((_, j) => j !== i) })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <Label>Title</Label>
                <Input value={listings[editIndex].title} onChange={(e) => updateListing(editIndex, { title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={listings[editIndex].description} onChange={(e) => updateListing(editIndex, { description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (USD)</Label>
                  <Input type="number" value={listings[editIndex].price} onChange={(e) => updateListing(editIndex, { price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={listings[editIndex].category} onValueChange={(v) => updateListing(editIndex, { category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditIndex(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkProductPoster;
