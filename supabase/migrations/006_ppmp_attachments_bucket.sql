-- Create storage bucket for PPMP attachments
-- Note: Run this migration only if your Supabase project has storage enabled.
-- If it fails, create the bucket manually via Dashboard: Storage > New bucket > "ppmp-attachments"

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ppmp-attachments',
  'ppmp-attachments',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;
