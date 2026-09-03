export type MediaType = 'image' | 'video';
export type MediaSource = 'webcam' | 'upload';

export interface Memory {
  id: string;
  storage_path: string;
  bucket_name: 'webcam-private' | 'album-public';
  filepath: string;
  filename: string;
  media_type: MediaType;
  title: string;
  description: string | null;
  memory_date: string | null;
  source: MediaSource;
  is_published: boolean;
  created_at: string;
  published_at: string | null;
  year: string;
}
