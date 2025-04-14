/*
  # Update Storage Policies

  1. Changes
    - Add storage policies for authenticated users to manage their PDFs
    - Add storage policy for public access to shared PDFs
*/

-- Enable storage policies
BEGIN;

-- Allow authenticated users to upload PDFs
CREATE POLICY "Users can upload PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdfs');

-- Allow authenticated users to read their own PDFs
CREATE POLICY "Users can read their own PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdfs');

-- Allow authenticated users to delete their own PDFs
CREATE POLICY "Users can delete their own PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pdfs');

-- Allow public access to PDFs (needed for shared links)
CREATE POLICY "Public can read PDFs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'pdfs');

COMMIT;