import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Play, Volume2, Video } from 'lucide-react';

interface MediaFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_purpose: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

const MediaManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [filePurpose, setFilePurpose] = useState<string>('welcome_voice');

  const { data: mediaFiles = [] } = useQuery({
    queryKey: ['media-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MediaFile[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${filePurpose}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media-files')
        .getPublicUrl(filePath);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('media_files')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'image',
          file_purpose: filePurpose,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
      toast({
        title: 'Success',
        description: 'Media file uploaded successfully',
      });
      setUploading(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to upload file: ${error.message}`,
        variant: 'destructive',
      });
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (mediaFile: MediaFile) => {
      // Delete from storage
      const fileName = mediaFile.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('media-files')
          .remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from('media_files')
        .delete()
        .eq('id', mediaFile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
      toast({
        title: 'Success',
        description: 'Media file deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete file: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      toast({
        title: 'Error',
        description: 'Please upload only audio or video files',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    uploadMutation.mutate(file);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'audio') return <Volume2 className="h-5 w-5" />;
    if (fileType === 'video') return <Video className="h-5 w-5" />;
    return <Play className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Media Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-purpose">File Purpose</Label>
            <Select value={filePurpose} onValueChange={setFilePurpose}>
              <SelectTrigger id="file-purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome_voice">Welcome Voice Message</SelectItem>
                <SelectItem value="promotional">Promotional Video/Audio</SelectItem>
                <SelectItem value="background_music">Background Music</SelectItem>
                <SelectItem value="notification_sound">Notification Sound</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload File (Audio/Video)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <Button disabled={uploading} size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Accepted formats: MP3, MP4, WAV, OGG, WebM, etc.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Media Files</CardTitle>
        </CardHeader>
        <CardContent>
          {mediaFiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No media files uploaded yet
            </p>
          ) : (
            <div className="space-y-2">
              {mediaFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.file_type)}
                    <div>
                      <p className="font-medium">{file.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Purpose: {file.file_purpose.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        URL: {file.file_url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(file.file_url, '_blank')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteMutation.mutate(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MediaManagement;