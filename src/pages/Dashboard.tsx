import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import PDFUploader from '../components/PDFUploader';
import type { PDF } from '../lib/types';
// (Optionally, if using UUID generation for tokens)
import { v4 as uuidv4 } from 'uuid';

// Example stub for email sending
// You will replace this with your actual email sending implementation (e.g., via a serverless function or email service)
async function sendInviteEmail({ to, shareUrl, pdfName }: { to: string; shareUrl: string; pdfName: string; }) {
  // For demo purposes, we just log the email payload
  console.log('Sending invite email to:', to, 'with link:', shareUrl, 'for PDF:', pdfName);
  // Here you would typically make a POST request to your email service endpoint.
  // Return an object with an "error" property if something goes wrong.
  return { error: null };
}

export default function Dashboard() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    try {
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) {
        throw new Error('User not authenticated');
      }
      const userId = authData.user.id;

      const { data, error } = await supabase
        .from('pdfs')
        .select('*')
        .eq('user_id', userId)  // Only fetch PDFs belonging to this user
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPdfs(data || []);
    } catch (error) {
      console.error('Error loading PDFs:', error);
      toast.error('Failed to load PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const pdf = pdfs.find((p) => p.id === id);
      if (!pdf) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('pdfs')
        .remove([pdf.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('pdfs')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setPdfs(pdfs.filter((p) => p.id !== id));
      toast.success('PDF deleted successfully');
    } catch (error) {
      console.error('Error deleting PDF:', error);
      toast.error('Failed to delete PDF');
    }
  };

  // Existing copy share link function
  const copyShareLink = async (pdf: PDF) => {
    const shareUrl = `${window.location.origin}/shared/${pdf.shared_link}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  // NEW: Email share handler
  const handleEmailShare = async (pdf: PDF) => {
    try {
      // Prompt for invitee's email address (you might replace this with a proper modal or form)
      const email = prompt("Enter the invitee's email address:");
      if (!email) return;

      // Ensure share token exists - if none exists, generate one and update the PDF record.
      let shareToken = pdf.share_token; // using 'shared_link' field from your PDF
      if (!shareToken) {
        shareToken = uuidv4();
        const { error: updateError } = await supabase
          .from('pdfs')
          .update({ share_token: shareToken })
          .eq('id', pdf.id);
        if (updateError) {
          throw new Error('Failed to update PDF with share link');
        }
      }

      // Build the share URL
      const shareUrl = `${window.location.origin}/shared/${shareToken}`;

      // Send email invite via your email service
      const { error: emailError } = await sendInviteEmail({
        to: email,
        shareUrl,
        pdfName: pdf.name,
      });
      if (emailError) throw emailError;

      toast.success('Invite link sent via email!');
    } catch (error) {
      console.error('Error sending invite link:', error);
      toast.error('Failed to send invite link');
    }
  };

  // Filter PDFs by search term
  const filteredPdfs = pdfs.filter((pdf) =>
    pdf.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Upload PDF</h1>
        <PDFUploader onUploadComplete={(pdf) => setPdfs([pdf, ...pdfs])} />
      </div>

      {/* PDF List Section */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* Header with Search Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">My PDFs</h2>
          <input
            type="text"
            placeholder="Search PDFs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {filteredPdfs.length === 0 ? (
          <p className="text-center text-gray-500">
            {searchTerm
              ? 'No PDFs match your search.'
              : 'No PDFs uploaded yet.'}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredPdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <Link
                  to={`/pdf/${pdf.id}`}
                  className="flex items-center flex-1 min-w-0"
                >
                  <FileText className="h-6 w-6 text-indigo-500 flex-shrink-0" />
                  <span className="ml-3 truncate text-gray-900">{pdf.name}</span>
                </Link>
                <div className="flex items-center space-x-4 ml-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      copyShareLink(pdf);
                    }}
                    className="text-gray-400 hover:text-indigo-500"
                    title="Copy share link"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  {/* NEW: Email share button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleEmailShare(pdf);
                    }}
                    className="text-gray-400 hover:text-indigo-500"
                    title="Send invite via email"
                  >
                    {/* You can use an icon or plain text label */}
                    Send Email
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(pdf.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete PDF"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
