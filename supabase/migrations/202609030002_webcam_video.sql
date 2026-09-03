update storage.buckets
set
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'video/webm', 'video/mp4']
where id = 'webcam-private';
