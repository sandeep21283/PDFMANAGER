/*
  # PDF Management System Schema

  1. New Tables
    - `pdfs`
      - `id` (uuid, primary key)
      - `name` (text) - Original filename
      - `file_path` (text) - Storage path
      - `user_id` (uuid) - Owner reference
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `shared_link_id` (uuid) - Unique ID for sharing
    
    - `comments`
      - `id` (uuid, primary key)
      - `pdf_id` (uuid) - Reference to PDF
      - `user_id` (uuid) - Comment author
      - `content` (text) - Comment text
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for:
      - PDF owners can perform all operations
      - Users with shared link can view PDFs
      - Comment authors can manage their comments
      - PDF owners can view all comments
*/

-- Create PDFs table
CREATE TABLE IF NOT EXISTS pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_path text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  shared_link_id uuid DEFAULT gen_random_uuid(),
  UNIQUE(shared_link_id)
);

-- Enable RLS for PDFs
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

-- Policies for PDFs
CREATE POLICY "Users can manage their own PDFs"
  ON pdfs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared PDFs"
  ON pdfs
  FOR SELECT
  TO anon, authenticated
  USING (shared_link_id = current_setting('request.shared_link_id', true)::uuid);

-- Create Comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id uuid NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for Comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies for Comments
CREATE POLICY "Users can manage their own comments"
  ON comments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "PDF owners can view all comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pdfs WHERE pdfs.id = comments.pdf_id AND pdfs.user_id = auth.uid()
  ));

CREATE POLICY "Users can view comments on shared PDFs"
  ON comments
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM pdfs 
    WHERE pdfs.id = comments.pdf_id 
    AND pdfs.shared_link_id = current_setting('request.shared_link_id', true)::uuid
  ));