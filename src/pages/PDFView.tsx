import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { PDF, Comment } from '../lib/types';

// Set up PDF.js worker using the current version.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * Helper function to fetch user profiles by their IDs from the public "profiles" table.
 * Returns an object mapping user IDs to an object with the user's name.
 */
const fetchUsersByIds = async (
  userIds: string[]
): Promise<Record<string, { name: string }>> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    if (error) throw error;

    const mapping: Record<string, { name: string }> = {};
    data.forEach((profile) => {
      mapping[profile.id] = { name: profile.name || 'Guest' };
    });
    return mapping;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return {};
  }
};

export default function PDFView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pdf, setPdf] = useState<PDF | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch the PDF record based on the PDF id.
  useEffect(() => {
    if (!id) return;
    loadPDF();
    loadComments();

    // Subscribe to new comment inserts
    const subscription = supabase
      .channel('comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `pdf_id=eq.${id}`,
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            // Optionally, you could merge the new comment with user data here,
            // or simply reload all comments.
            setComments(prev => [...prev, payload.new as Comment]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const loadPDF = async () => {
    try {
      const { data: pdfData, error } = await supabase
        .from('pdfs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!pdfData) {
        navigate('/');
        return;
      }

      // Get the public URL for the stored PDF file.
      const { data: storageData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(pdfData.file_path);

      setPdf({ ...pdfData, file_path: storageData.publicUrl });
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Separate comments fetching and merging profile data.
  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('pdf_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) {
        setComments([]);
        return;
      }

      // Extract unique, non-null user_ids.
      const userIds = Array.from(
        new Set(data.map((comment: Comment) => comment.user_id).filter(Boolean))
      ) as string[];

      let userMapping: Record<string, { name: string }> = {};
      if (userIds.length > 0) {
        userMapping = await fetchUsersByIds(userIds);
      }

      // Merge the fetched profiles into the comments.
      const mergedComments = data.map((comment: Comment) => ({
        ...comment,
        user:
          comment.user_id && userMapping[comment.user_id]
            ? userMapping[comment.user_id]
            : null,
      }));

      setComments(mergedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    }
  };

  // Add a comment. If a session exists, use the user_id; otherwise post as Guest (user_id: null)
  const addComment = async () => {
    if (!newComment.trim()) return;
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user ? authData.user.id : null;
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          pdf_id: id,
          content: newComment.trim(),
          user_id: userId,
        });
      if (error) throw error;
      setNewComment('');
      loadComments();
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
      <div className="flex items-center justify-center min-h-screen">
        <p>No PDF available.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Column: PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
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
      </div>

      {/* Right Column: Comments Sidebar */}
      <div className="w-96 border-l bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-900">
                  {comment.user?.name ? comment.user.name : "Guest"}
                </p>
                <p className="text-sm text-gray-900">{comment.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
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
  );
}
