import React, { useCallback, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { PDF } from '../lib/types';

interface PDFUploaderProps {
  onUploadComplete: (pdf: PDF) => void;
}

export default function PDFUploader({ onUploadComplete }: PDFUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setUploading(true);

      // Ensure the file is a PDF by checking the file's MIME type.
      if (!file.type.includes('pdf')) {
        throw new Error('Please upload a PDF file');
      }

      // Create a unique filename to prevent collisions.
      const timestamp = new Date().getTime();
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Upload the file to the Supabase storage bucket "pdfs".
      const { error: uploadError, data } = await supabase.storage
        .from('pdfs')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('Storage error:', uploadError);
        throw new Error('Failed to upload file to storage');
      }

      if (!data?.path) {
        throw new Error('No file path returned from storage');
      }

      // Get the current authenticated user.
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) {
        throw new Error('User not authenticated');
      }
      const userId = authData.user.id;

      // Construct the public URL for the PDF.
      const bucketUrl = "https://mshzrnauafqpdarzefkc.supabase.co/storage/v1/object/public/pdfs";
      const publicURL = `${bucketUrl}/${data.path.startsWith('/') ? data.path.slice(1) : data.path}`;

      // Insert a new record in the 'pdfs' table with PDF metadata.
      // We store the original file name, the file path (as returned by storage),
      // the user_id, and also create a share link (which here is the public URL).
      const { error: dbError, data: pdf } = await supabase
        .from('pdfs')
        .insert([
          {
            name: file.name,
            file_path: data.path,
            user_id: userId,
            shared_link_id: null,  // Initialize as null, if needed
            shared_link: publicURL,
          },
        ])
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Optionally remove the file from storage to avoid orphaned files if insert fails.
        throw new Error('Failed to create database record');
      }

      if (!pdf) {
        throw new Error('No PDF data returned from database');
      }

      // Call the parent callback with the uploaded PDF record.
      onUploadComplete(pdf);
      toast.success('PDF uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to upload PDF. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors duration-200"
    >
      <input
        type="file"
        id="pdf-upload"
        accept=".pdf,application/pdf"
        onChange={handleChange}
        className="hidden"
      />
      <label
        htmlFor="pdf-upload"
        className="cursor-pointer flex flex-col items-center justify-center"
      >
        {uploading ? (
          <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
        ) : (
          <Upload className="h-12 w-12 text-gray-400" />
        )}
        <p className="mt-4 text-sm text-gray-600">
          {uploading
            ? 'Uploading...'
            : 'Drag and drop your PDF here, or click to select'}
        </p>
      </label>
    </div>
  );
}
