import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Image, Video, Mic, Type, Upload, Palette, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface StatusUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BACKGROUND_COLORS = [
  '#FF69B4', '#FF1493', '#DB7093', '#FFB6C1',
  '#8B5CF6', '#A855F7', '#C084FC', '#E879F9',
  '#3B82F6', '#06B6D4', '#22D3EE', '#67E8F9',
  '#10B981', '#34D399', '#6EE7B7', '#A7F3D0',
  '#F59E0B', '#FBBF24', '#FDE047', '#FEF08A',
  '#EF4444', '#F87171', '#FCA5A5', '#FECACA',
  '#1F2937', '#374151', '#4B5563', '#6B7280',
];

const StatusUploadModal = ({ onClose, onSuccess }: StatusUploadModalProps) => {
  const { user } = useAuth();
  const [contentType, setContentType] = useState<'text' | 'image' | 'video' | 'voice'>('text');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#FF69B4');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [visibility, setVisibility] = useState<'all' | 'selected' | 'except'>('all');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to post a status');
      return;
    }

    if (contentType === 'text' && !textContent.trim()) {
      toast.error('Please enter some text');
      return;
    }

    if (['image', 'video', 'voice'].includes(contentType) && !file) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);

    try {
      let contentUrl = null;

      // Upload file if needed
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('status-media')
          .upload(fileName, file);

        if (uploadError) {
          // Try creating bucket if it doesn't exist
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload file');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('status-media')
          .getPublicUrl(fileName);

        contentUrl = publicUrl;
      }

      // Create status
      const { error: statusError } = await supabase
        .from('user_statuses')
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_url: contentUrl,
          text_content: contentType === 'text' ? textContent : null,
          background_color: contentType === 'text' ? backgroundColor : null,
          caption: caption || null,
          visibility: visibility
        });

      if (statusError) throw statusError;

      toast.success('Status posted! It will be visible for 24 hours');
      onSuccess();
    } catch (error: any) {
      console.error('Error posting status:', error);
      toast.error(error.message || 'Failed to post status');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-background to-pink-soft/30 border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-pink-vibrant bg-clip-text text-transparent">
            ✨ Create Status
          </DialogTitle>
        </DialogHeader>

        <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="text" className="gap-1.5">
              <Type className="h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5">
              <Image className="h-4 w-4" />
              Image
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-1.5">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-1.5">
              <Mic className="h-4 w-4" />
              Voice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            {/* Text Status Preview */}
            <div 
              className="aspect-[9/16] max-h-[300px] rounded-xl flex items-center justify-center p-6 transition-colors"
              style={{ backgroundColor }}
            >
              <p className="text-white text-xl font-bold text-center leading-relaxed">
                {textContent || 'Your status text...'}
              </p>
            </div>

            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What's on your mind?"
              className="resize-none"
              maxLength={500}
            />

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Background Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      backgroundColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBackgroundColor(color)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-4">
            {filePreview ? (
              <div className="relative aspect-[9/16] max-h-[300px] rounded-xl overflow-hidden bg-black">
                <img src={filePreview} alt="Preview" className="w-full h-full object-contain" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => { setFile(null); setFilePreview(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="aspect-[9/16] max-h-[300px] rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 bg-muted/50">
                <Camera className="h-12 w-12 text-primary/50" />
                <span className="text-sm text-muted-foreground">Click to upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
            />
          </TabsContent>

          <TabsContent value="video" className="space-y-4 mt-4">
            {filePreview ? (
              <div className="relative aspect-[9/16] max-h-[300px] rounded-xl overflow-hidden bg-black">
                <video src={filePreview} className="w-full h-full object-contain" controls />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => { setFile(null); setFilePreview(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="aspect-[9/16] max-h-[300px] rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 bg-muted/50">
                <Video className="h-12 w-12 text-primary/50" />
                <span className="text-sm text-muted-foreground">Click to upload video (max 30s)</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
            />
          </TabsContent>

          <TabsContent value="voice" className="space-y-4 mt-4">
            {filePreview ? (
              <div className="relative aspect-[9/16] max-h-[300px] rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-pink-vibrant/20 flex items-center justify-center">
                <audio src={filePreview} controls className="w-4/5" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => { setFile(null); setFilePreview(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="aspect-[9/16] max-h-[300px] rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 bg-muted/50">
                <Mic className="h-12 w-12 text-primary/50" />
                <span className="text-sm text-muted-foreground">Click to upload voice clip</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
            />
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1 bg-gradient-to-r from-primary to-pink-vibrant"
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="animate-pulse">Posting...</span>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Post Status
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatusUploadModal;
