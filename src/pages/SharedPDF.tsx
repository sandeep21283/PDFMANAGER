import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { PDF, Comment } from '../lib/types';

// Set up PDF.js worker using the current version.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * Helper function to fetch user profiles from your public "profiles" table.
 * This function returns an object mapping user IDs to their profile data (here, just the name).
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

export default function SharedPDF() {
  // The URL parameter "id" represents the share token stored in the pdfs table.
  const { id: shareToken } = useParams();
  const navigate = useNavigate();

  const [pdf, setPdf] = useState<PDF | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Comments state – Comment type now should include an optional "user" field.
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Fetch the shared PDF record based on the share token.
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
        const { data: storageData } = await  supabase.storage
                .from('pdfs')
                .createSignedUrl(data.file_path,60);


      

        setPdf({ ...data, file_path:storageData?.signedUrl  });
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

  // Load comments for the PDF.
  const loadComments = async (pdfId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('pdf_id', pdfId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data) {
        setComments([]);
        return;
      }

      // Extract unique, non-null user_ids from comments.
      const userIds = Array.from(
        new Set(data.map((c: Comment) => c.user_id).filter(Boolean))
      ) as string[];

      let userMapping: Record<string, { name: string }> = {};
      if (userIds.length > 0) {
        userMapping = await fetchUsersByIds(userIds);
      }

      // Merge the fetched profile data into each comment.
      const mergedComments = data.map((comment: Comment) => ({
        ...comment,
        user:
          comment.user_id && userMapping[comment.user_id]
            ? userMapping[comment.user_id]
            : null,
      }));
      setComments(mergedComments);
    } catch (err) {
      console.error("Error loading comments:", err);
      toast.error("Failed to load comments.");
    }
  };

  // Load comments once the PDF is loaded.
  useEffect(() => {
    if (pdf && pdf.id) {
      loadComments(pdf.id);
    }
  }, [pdf]);

  // Handler to add a comment.
  // If an authenticated session exists, store its user id; otherwise, store null.
  const addComment = async () => {
    if (!pdf || !pdf.id || !newComment.trim()) return;
    try {
      // Check for an authenticated user.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      let userId: string | null = null;
      if (!authError && authData.user) {
        userId = authData.user.id;
      }
      const { error } = await supabase
        .from('comments')
        .insert({
          pdf_id: pdf.id,
          content: newComment.trim(),
          user_id: userId, // Will be either a valid ID or null for guest comments
        });
      if (error) throw error;
      setNewComment('');
      await loadComments(pdf.id);
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
    <div className="flex h-[calc(100vh-4rem)]">
    
      {/* Left Column: PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
      <h1>Shared Pdf Platform</h1>
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
          <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {pdf.name}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Page {pageNumber} {numPages ? `of ${numPages}` : ''}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setPageNumber((prev) =>
                      numPages ? Math.min(prev + 1, numPages) : prev
                    )
                  }
                  disabled={numPages !== null ? pageNumber >= numPages : false}
                  className="px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
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

      {/* Right Column: Comments */}
      <div className="w-96 border-l bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-bold text-gray-900">
                  {comment.user && comment.user.name ? comment.user.name : "Guest"}
                </p>
                <p className="text-sm text-gray-900">{comment.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t">
          <div className="flex flex-col space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[50px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
    </div>
  );
}
