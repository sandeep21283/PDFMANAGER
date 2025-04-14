import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { PDF, Comment } from '../lib/types';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function SharedPDF() {
  const { id: shareToken } = useParams(); // This id is our share token
  const navigate = useNavigate();
  
  const [pdf, setPdf] = useState<PDF | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Load PDF record based on share token
  useEffect(() => {
    if (!shareToken) return;
    const fetchSharedPDF = async () => {
      try {
        const { data, error } = await supabase
          .from('pdfs')
          .select('*')
          .eq('share_token', shareToken)
          .single();
        if (error || !data) {
          toast.error("Shared PDF not found.");
          navigate('/');
          return;
        }
        // Get the public URL from Supabase storage
        const { data: storageData } = supabase.storage
          .from('pdfs')
          .getPublicUrl(data.file_path);
        setPdf({ ...data, file_path: storageData.publicUrl });
      } catch (err) {
        console.error("Error fetching shared PDF:", err);
        toast.error("An error occurred while fetching the shared PDF.");
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedPDF();
  }, [shareToken, navigate]);

  // Function to load comments for this PDF
  const loadComments = async (pdfId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('pdf_id', pdfId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Error loading comments:", err);
      toast.error("Failed to load comments.");
    }
  };

  // When the PDF is loaded, fetch its comments
  useEffect(() => {
    if (pdf && pdf.id) {
      loadComments(pdf.id);
    }
  }, [pdf]);

  // Handler to add a comment (guest user, no authentication required)
  const addComment = async () => {
    if (!newComment.trim() || !pdf || !pdf.id) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          pdf_id: pdf.id,
          content: newComment.trim(),
          user_id: null // null indicates a guest comment
        });
      if (error) throw error;
      setNewComment('');
      // Reload comments after insertion
      loadComments(pdf.id);
      toast.success("Comment added!");
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error("Failed to add comment.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>Loading shared PDF...</p>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>No PDF available.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Shared PDF: {pdf.name}</h1>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
        <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Page {pageNumber} {numPages ? `of ${numPages}` : ''}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
              disabled={pageNumber <= 1}
              className="px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || prev))}
              disabled={numPages !== null ? pageNumber >= numPages : false}
              className="px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        <div className="flex justify-center p-4">
          <Document
            file={pdf.file_path}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="animate-pulse">
                <div className="h-[842px] w-[595px] bg-gray-200 rounded" />
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>

      {/* Comments Section */}
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="p-4 bg-gray-50 rounded">
                <p className="text-gray-900 text-sm">{comment.content}</p>
                <p className="text-gray-500 text-xs">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment Form */}
        <div className="mt-4">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
          />
          <button
            onClick={addComment}
            disabled={!newComment.trim()}
            className="mt-2 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Post Comment
          </button>
        </div>
      </div>
    </div>
  );
}
