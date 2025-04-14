import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { PDF, Comment } from '../lib/types';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function SharedPDF() {
  const { id } = useParams();
  const [pdf, setPdf] = useState<PDF | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadPDF();
    loadComments();

    // Subscribe to comments
    const subscription = supabase
      .channel('comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `pdf_id=eq.${id}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setComments(prev => [...prev, payload.new as Comment]);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const loadPDF = async () => {
    try {
      // Set the shared link ID in the database session
      await supabase.rpc('set_claim', {
        claim: 'request.shared_link_id',
        value: id
      });

      const { data: pdf, error } = await supabase
        .from('pdfs')
        .select('*')
        .eq('shared_link_id', id)
        .single();

      if (error) throw error;
      if (!pdf) {
        toast.error('PDF not found');
        return;
      }

      // Get download URL
      const { data: { publicUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(pdf.file_path);

      setPdf({ ...pdf, file_path: publicUrl });
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('pdf_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !pdf) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          pdf_id: pdf.id,
          content: newComment.trim(),
        });

      if (error) throw error;
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">PDF Not Found</h1>
          <p className="text-gray-500">This PDF may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex space-x-6">
          {/* PDF Viewer */}
          <div className="flex-1 bg-white shadow rounded-lg overflow-hidden">
            <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {pdf.name}
              </h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {pageNumber} of {numPages || '?'}
                </span>
                <button
                  onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || prev))}
                  disabled={pageNumber >= (numPages || 1)}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
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

          {/* Comments Sidebar */}
          <div className="w-96 bg-white shadow rounded-lg flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900">{comment.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <button
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}