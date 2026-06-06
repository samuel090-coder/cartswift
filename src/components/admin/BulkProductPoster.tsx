import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Pencil, Send, Sparkles, Trash2, Upload, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

const VISION_CHUNK_SIZE = 6;
const ANALYSIS_PARALLEL = 2;
const GROUP_CHUNK_SIZE = 50;
const MAX_RETRIES = 3;
const UPLOAD_PROGRESS_SHARE = 35;
const ANALYZE_PROGRESS_SHARE = 45;
const GROUP_PROGRESS_SHARE = 20;

type Listing = {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
  sourceIds?: string[];
  posted?: boolean;
  posting?: boolean;
};

type PreparedImage = {
  sourceId: string;
  name: string;
  url: string;
  file: File;
};

const CATEGORIES = ['fashion', 'books', 'tools', 'vehicles', 'animals'] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  fashion: 'Fashion',
  books: 'Books',
  tools: 'Tools',
  vehicles: 'Vehicles',
  animals: 'Animals',
};
const CATEGORY_KEYWORDS: Record<(typeof CATEGORIES)[number], string[]> = {
  fashion: ['fashion', 'clothing', 'apparel', 'shoe', 'shoes', 'sneaker', 'heel', 'heels', 'boot', 'boots', 'sandal', 'sandals', 'bag', 'handbag', 'dress', 'shirt', 'watch', 'jewelry', 'jacket'],
  books: ['book', 'books', 'novel', 'magazine', 'textbook', 'comic', 'manual', 'guide'],
  tools: ['tool', 'tools', 'hardware', 'equipment', 'machine', 'kit', 'device', 'appliance', 'gadget'],
  vehicles: ['vehicle', 'vehicles', 'car', 'cars', 'toyota', 'honda', 'bmw', 'benz', 'mercedes', 'lamborghini', 'truck', 'bike', 'bicycle', 'motorcycle', 'scooter', 'van', 'bus', 'suv', 'sedan'],
  animals: ['animal', 'animals', 'pet', 'pets', 'dog', 'cat', 'bird', 'fish', 'horse', 'puppy', 'kitten'],
};
const JPG_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']);
const UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const uniqueStrings = (items: string[] = []) => Array.from(new Set(items.filter(Boolean)));

const filenameToTitle = (name: string) =>
  (() => {
    const cleaned = name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || /^\d+$/.test(cleaned) || isOpaqueIdentifier(cleaned)) return 'Product Draft';
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  })();

const isOpaqueIdentifier = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return /^[a-f0-9]{8,}(?:[\s-]?[a-f0-9]{4,}){2,}$/.test(normalized.replace(/\s+/g, ''));
};

const inferCategoryScores = (text: string) =>
  CATEGORIES.reduce((acc, category) => {
    acc[category] = CATEGORY_KEYWORDS[category].reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
    return acc;
  }, {} as Record<(typeof CATEGORIES)[number], number>);

const normalizeCategory = (...parts: string[]) => {
  const [rawCategory = '', ...contextParts] = parts.map((part) => (part || '').toLowerCase().trim());
  const context = contextParts.filter(Boolean).join(' ');
  const scores = inferCategoryScores(`${rawCategory} ${context}`.trim());
  const inferred = CATEGORIES.reduce((best, category) => (scores[category] > scores[best] ? category : best), 'tools' as (typeof CATEGORIES)[number]);
  const rawIsKnown = CATEGORIES.includes(rawCategory as (typeof CATEGORIES)[number]);
  const rawScore = rawIsKnown ? scores[rawCategory as (typeof CATEGORIES)[number]] : -1;
  const inferredScore = scores[inferred];

  if (inferredScore > Math.max(rawScore, 0)) return inferred;
  if (rawIsKnown) return rawCategory as (typeof CATEGORIES)[number];
  if (inferredScore > 0) return inferred;
  return 'tools';
};

const isGenericTitle = (title: string) => {
  const value = title.trim().toLowerCase();
  return !value || isOpaqueIdentifier(value) || ['uploaded product', 'product', 'uploaded image', 'item', 'goods'].includes(value);
};

const GENERIC_DESCRIPTION_FRAGMENTS = [
  'review this ai-generated draft before posting',
  'ai generated a draft from this uploaded image',
  'ai could not fully classify this image',
];

const hasMeaningfulDescription = (description: string) => {
  const value = description.trim().toLowerCase();
  return value.length >= 40 && !GENERIC_DESCRIPTION_FRAGMENTS.some((fragment) => value.includes(fragment));
};

const listingNeedsRecovery = (listing: Listing) =>
  isGenericTitle(listing.title) || !hasMeaningfulDescription(listing.description) || listing.price <= 0;

const listingQualityScore = (listing: Listing) => {
  let score = 0;
  if (!isGenericTitle(listing.title)) score += 3;
  if (hasMeaningfulDescription(listing.description)) score += 2;
  if (listing.price > 0) score += 2;
  if (listing.category !== 'tools') score += 1;
  if ((listing.images?.length || 0) > 0) score += 1;
  if ((listing.sourceIds?.length || 0) > 0) score += 1;
  return score;
};

const dedupeListings = (items: Listing[]) => {
  const bestByKey = new Map<string, Listing>();

  items.forEach((listing) => {
    const keys = [
      ...(listing.sourceIds || []).map((sourceId) => `source:${sourceId}`),
      ...(listing.images || []).map((image) => `image:${image}`),
    ];

    const canonicalKey = keys[0] || `${listing.title}:${listing.description}`;
    const existing = bestByKey.get(canonicalKey);
    if (!existing || listingQualityScore(listing) > listingQualityScore(existing)) {
      bestByKey.set(canonicalKey, listing);
    }

    keys.forEach((key) => {
      const current = bestByKey.get(key);
      if (!current || listingQualityScore(listing) > listingQualityScore(current)) {
        bestByKey.set(key, listing);
      }
    });
  });

  return Array.from(new Set(bestByKey.values())).filter((listing) => listing.images.length > 0 || (listing.sourceIds?.length || 0) > 0);
};

const normalizeUploadMimeType = (file: File) => {
  if (JPG_MIME_TYPES.has(file.type.toLowerCase())) return 'image/jpeg';

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'bmp') return 'image/bmp';

  return file.type.startsWith('image/') ? file.type : 'image/jpeg';
};

const isSupportedImageFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return file.type.startsWith('image/') || SUPPORTED_IMAGE_EXTENSIONS.has(extension);
};

const formatCategoryLabel = (category: string) =>
  CATEGORY_LABELS[normalizeCategory(category) as (typeof CATEGORIES)[number]] || 'Tools';

const mapCategoryToDbValue = (category: string) => formatCategoryLabel(category);

const normalizeListing = (listing: Partial<Listing>): Listing => {
  const category = normalizeCategory(listing.category || '', listing.title || '', listing.description || '');

  const trimmedTitle = (listing.title || '').trim();
  const fallbackTitle = 'Product Draft';
  const safeTitle = !trimmedTitle || /^\d+$/.test(trimmedTitle) || isGenericTitle(trimmedTitle) ? fallbackTitle : trimmedTitle;

  return {
    title: safeTitle,
    description: (listing.description || 'Review this AI-generated draft before posting.').trim(),
    category,
    price: Number.isFinite(Number(listing.price)) ? Math.max(0, Number(listing.price)) : 0,
    currency: (listing.currency || 'USD').trim() || 'USD',
    images: uniqueStrings(listing.images || []),
    sourceIds: uniqueStrings(listing.sourceIds || []),
    posted: listing.posted,
    posting: listing.posting,
  };
};

const fallbackListingFromImage = (image: PreparedImage): Listing =>
  normalizeListing({
    title: filenameToTitle(image.name),
    description: 'AI generated a draft from this uploaded image. Review and refine it before posting.',
    category: normalizeCategory(image.name),
    price: 0,
    currency: 'USD',
    images: [image.url],
    sourceIds: [image.sourceId],
  });

const estimateGroupingCalls = (count: number) => {
  if (count <= 1) return 0;
  let total = 0;
  let current = count;
  while (current > 1) {
    const callsThisRound = Math.ceil(current / GROUP_CHUNK_SIZE);
    total += callsThisRound;
    if (callsThisRound === 1) break;
    current = callsThisRound;
  }
  return total;
};

const BulkProductPoster = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [postingAll, setPostingAll] = useState(false);
  const [generatingDetails, setGeneratingDetails] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const invokeBulkAI = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('ai-bulk-detect-products', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const invokeSingleImageAI = async (imageUrl: string) => {
    const { data, error } = await supabase.functions.invoke('analyze-product-image', {
      body: { imageUrl },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const invokeWithRetry = async <T,>(label: string, run: () => Promise<T>): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await run();
      } catch (error: any) {
        lastError = error;
        const message = error?.message || 'Unknown error';
        const shouldStop = message.includes('AI credits depleted') || message.includes('Payment Required');
        if (attempt === MAX_RETRIES || shouldStop) break;
        await wait(900 * (attempt + 1));
      }
    }

    console.error(`${label} failed after retries`, lastError);
    throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
  };

  const runInParallelWaves = async <T, U>(
    items: T[],
    parallel: number,
    worker: (item: T, index: number) => Promise<U>,
  ): Promise<U[]> => {
    const results: U[] = [];
    for (let i = 0; i < items.length; i += parallel) {
      const wave = items.slice(i, i + parallel).map((item, offset) => worker(item, i + offset));
      const waveResults = await Promise.all(wave);
      results.push(...waveResults);
    }
    return results;
  };

  const uploadAndPrepareImages = async (files: File[]) => {
    const prepared: PreparedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sourceId = crypto.randomUUID();
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `bulk/${Date.now()}-${sourceId}.${extension}`;

      const uploadResult = await supabase.storage.from('item-images').upload(path, file, {
        contentType: normalizeUploadMimeType(file),
        upsert: false,
      });

      if (uploadResult.error) {
        console.error('Storage upload failed', {
          message: uploadResult.error.message,
          name: file.name,
          size: file.size,
          type: file.type,
          path,
        });
        throw new Error(`Image upload failed for "${file.name}": ${uploadResult.error.message}`);
      }

      const { data } = supabase.storage.from('item-images').getPublicUrl(path);

      prepared.push({
        sourceId,
        name: file.name,
        url: data.publicUrl,
        file,
      });

      const pct = Math.round(((i + 1) / files.length) * UPLOAD_PROGRESS_SHARE);
      setProgress(pct);
      setProgressLabel(`Uploading ${i + 1} / ${files.length}`);
    }

    return prepared;
  };

  const analyzeChunk = async (images: PreparedImage[], batchNumber: number) => {
    const imageBySourceId = new Map(images.map((image) => [image.sourceId, image]));

    const recoverListing = async (listing: Listing) => {
      const referenceImage = listing.sourceIds?.map((sourceId) => imageBySourceId.get(sourceId)).find(Boolean)
        || images.find((image) => listing.images.includes(image.url));

      if (!referenceImage) return listing;

      try {
        const dataUrl = await fileToDataUrl(referenceImage.file);
        const data = await invokeWithRetry(`Recovery image ${referenceImage.name}`, () =>
          invokeSingleImageAI(dataUrl),
        );

        const enriched = normalizeListing({
          title: data?.title || '',
          description: data?.description || listing.description,
          category: data?.category || listing.category,
          price: data?.price ?? listing.price,
          currency: data?.currency || listing.currency,
          images: listing.images.length > 0 ? listing.images : [referenceImage.url],
          sourceIds: listing.sourceIds?.length ? listing.sourceIds : [referenceImage.sourceId],
        });

        return listingNeedsRecovery(enriched)
          ? normalizeListing({
              ...listing,
              title: filenameToTitle(referenceImage.name),
              images: listing.images.length > 0 ? listing.images : [referenceImage.url],
              sourceIds: listing.sourceIds?.length ? listing.sourceIds : [referenceImage.sourceId],
            })
          : enriched;
      } catch (error) {
        console.error(`Single-image recovery failed for ${referenceImage.name}`, error);
        return normalizeListing({
          ...listing,
          title: filenameToTitle(referenceImage.name),
          images: listing.images.length > 0 ? listing.images : [referenceImage.url],
          sourceIds: listing.sourceIds?.length ? listing.sourceIds : [referenceImage.sourceId],
        });
      }
    };

    try {
      const data = await invokeWithRetry(`Vision batch ${batchNumber}`, () =>
        invokeBulkAI({
          mode: 'analyze',
          images: images.map(({ sourceId, name, url }) => ({ sourceId, name, url })),
        }),
      );

      const nextListings = Array.isArray(data?.listings) ? data.listings.map(normalizeListing) : [];
      if (nextListings.length > 0) {
        const enhancedListings = await Promise.all(nextListings.map((listing) => (
          listingNeedsRecovery(listing) ? recoverListing(listing) : Promise.resolve(listing)
        )));

        const recoveredSourceIds = new Set(enhancedListings.flatMap((listing) => listing.sourceIds || []));
        const missingImages = images.filter((image) => !recoveredSourceIds.has(image.sourceId));
        const missingRecovered = await Promise.all(missingImages.map((image) => recoverListing(fallbackListingFromImage(image))));
        return dedupeListings([...enhancedListings, ...missingRecovered].map(normalizeListing));
      }
    } catch (error) {
      console.warn(`Vision batch ${batchNumber} failed, retrying one image at a time`, error);
    }

    const recovered: Listing[] = [];

    for (const image of images) {
      try {
        const dataUrl = await fileToDataUrl(image.file);
        const data = await invokeWithRetry(`Recovery image ${image.name}`, () =>
          invokeSingleImageAI(dataUrl),
        );

        const enriched = normalizeListing({
          title: data?.title || '',
          description: data?.description || 'AI generated a draft from this uploaded image. Review and refine it before posting.',
          category: data?.category || normalizeCategory(image.name),
          price: data?.price ?? 0,
          currency: data?.currency || 'USD',
          images: [image.url],
          sourceIds: [image.sourceId],
        });

        recovered.push(isGenericTitle(enriched.title) ? fallbackListingFromImage(image) : enriched);
      } catch (error) {
        console.error(`Single-image recovery failed for ${image.name}`, error);
        recovered.push(fallbackListingFromImage(image));
      }
    }

    return recovered;
  };

  const groupListings = async (candidates: Listing[]) => {
    if (candidates.length <= 1) return candidates;

    const totalGroupingCalls = estimateGroupingCalls(candidates.length);
    let completedGroupingCalls = 0;
    let current = candidates.map(normalizeListing);

    while (current.length > 1) {
      const groups = current.length > GROUP_CHUNK_SIZE ? chunkArray(current, GROUP_CHUNK_SIZE) : [current];

      const mergedGroups = await runInParallelWaves(groups, 1, async (group) => {
        try {
          const data = await invokeWithRetry('AI grouping', () =>
            invokeBulkAI({
              mode: 'merge',
              candidates: group.map((listing) => ({
                title: listing.title,
                description: listing.description,
                category: listing.category,
                price: listing.price,
                currency: listing.currency,
                images: listing.images,
                sourceIds: listing.sourceIds || [],
              })),
            }),
          );

          const merged = Array.isArray(data?.listings) ? data.listings.map(normalizeListing) : [];
          return merged.length > 0 ? merged : group;
        } catch (error) {
          console.error('AI grouping batch failed', error);
          return group;
        } finally {
          completedGroupingCalls += 1;
          const pct =
            UPLOAD_PROGRESS_SHARE +
            ANALYZE_PROGRESS_SHARE +
            Math.round((completedGroupingCalls / Math.max(totalGroupingCalls, 1)) * GROUP_PROGRESS_SHARE);
          setProgress(Math.min(100, pct));
          setProgressLabel(`Grouping products ${completedGroupingCalls} / ${Math.max(totalGroupingCalls, 1)}`);
        }
      });

      current = mergedGroups.flat().map(normalizeListing);
      if (groups.length === 1) break;
    }

    return current;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const invalidFile = selectedFiles.find((file) => !isSupportedImageFile(file));
    if (invalidFile) {
      toast.error(`${invalidFile.name} is not a supported image. Use JPG, JPEG, PNG, WEBP, GIF, or BMP.`);
      return;
    }

    setUploading(true);
    setAnalyzing(false);
    setProgress(0);
    setProgressLabel(`Uploading 0 / ${selectedFiles.length}`);

    try {
      const preparedImages = await uploadAndPrepareImages(selectedFiles);

      setUploading(false);
      setAnalyzing(true);

      const analysisBatches = chunkArray(preparedImages, VISION_CHUNK_SIZE);
      let completedAnalysisBatches = 0;

      const detectedListings = (
        await runInParallelWaves(analysisBatches, ANALYSIS_PARALLEL, async (batch, index) => {
          const batchListings = await analyzeChunk(batch, index + 1);
          completedAnalysisBatches += 1;
          const pct =
            UPLOAD_PROGRESS_SHARE +
            Math.round((completedAnalysisBatches / analysisBatches.length) * ANALYZE_PROGRESS_SHARE);
          setProgress(Math.min(UPLOAD_PROGRESS_SHARE + ANALYZE_PROGRESS_SHARE, pct));
          setProgressLabel(`AI analyzing ${completedAnalysisBatches} / ${analysisBatches.length} batches`);
          return batchListings;
        })
      )
        .flat()
        .map(normalizeListing);

      const finalListings = await groupListings(detectedListings);

      if (finalListings.length === 0) {
        toast.error('AI could not prepare any product drafts from these uploads.');
        return;
      }

      setProgress(100);
      setProgressLabel(`Completed ${finalListings.length} product draft(s)`);
      setListings((prev) => [...prev, ...finalListings]);
      toast.success(`Detected ${finalListings.length} product draft(s)`);
    } catch (error: any) {
      console.error('Bulk AI processing failed', error);
      toast.error(error?.message || 'Failed to process uploaded images');
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setTimeout(() => {
        setProgress(0);
        setProgressLabel('');
      }, 800);
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
        category: mapCategoryToDbValue(l.category) as any,
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

  const generateAllDetails = async () => {
    const targets = listings
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => !l.posted && (l.images.length > 0 || (l.sourceIds?.length || 0) > 0));

    if (targets.length === 0) {
      toast.error('No drafts to generate details for.');
      return;
    }

    setGeneratingDetails(true);
    setGenerateProgress({ done: 0, total: targets.length });

    let ok = 0;
    const PARALLEL = 3;

    for (let i = 0; i < targets.length; i += PARALLEL) {
      const wave = targets.slice(i, i + PARALLEL);
      await Promise.all(
        wave.map(async ({ l, idx }) => {
          const imageUrl = l.images[0];
          if (!imageUrl) return;
          try {
            const data = await invokeWithRetry(`Generate details ${idx + 1}`, () =>
              invokeSingleImageAI(imageUrl),
            );
            const enriched = normalizeListing({
              ...l,
              title: data?.title || l.title,
              description: data?.description || l.description,
              category: data?.category || l.category,
              price: Number.isFinite(Number(data?.price)) && Number(data.price) > 0 ? Number(data.price) : l.price,
              currency: data?.currency || l.currency,
            });
            setListings((prev) => prev.map((x, j) => (j === idx ? { ...enriched, posted: x.posted, posting: x.posting } : x)));
            ok++;
          } catch (error: any) {
            console.error(`Generate details failed for listing ${idx}`, error);
          } finally {
            setGenerateProgress((prev) => ({ ...prev, done: prev.done + 1 }));
          }
        }),
      );
    }

    setGeneratingDetails(false);
    if (ok > 0) toast.success(`AI generated details for ${ok} product(s)`);
    else toast.error('AI could not generate details. Try again.');
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
            accept={UPLOAD_ACCEPT}
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

      {(uploading || analyzing) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-amber-400">
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> {progressLabel}
            </span>
            <span className="font-mono">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
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
                  <Badge variant="outline">{formatCategoryLabel(l.category)}</Badge>
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
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>)}
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
