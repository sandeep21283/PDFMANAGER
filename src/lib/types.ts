export interface PDF {
  id: string;
  name: string;
  file_path: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  shared_link_id: string;
  shared_link: string;
  share_token: string;
}

export interface Comment {
  id: string;
  pdf_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  path: string;
}