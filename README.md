                                                  PDF Management & Collaboration System

## 1. Overview

The **PDF Management & Collaboration System** is a web-based application designed to streamline the management and collaboration of PDF files. The application allows users to register, securely upload PDF files, share them via unique links, and collaborate in real time through comments. This documentation outlines the system’s objectives, features, technical architecture, installation and deployment instructions, and usage details.

## 2. Project Objectives

- **Seamless PDF Management:**  
  Enable users to upload and manage PDF files with format validation and secure storage.
  
- **User Authentication:**  
  Provide secure registration and login features using Supabase Auth. Passwords are hashed, and user metadata (such as display name) is stored in a public profiles table via triggers.

- **Collaboration and Sharing:**  
  Allow users to share PDFs via unique links. External users can access shared PDFs and collaborate by leaving comments.

- **Real-Time Comments:**  
  Display and update comments on PDFs in real time. For comments posted by authenticated users, display their display name from the public profiles table; otherwise, label them as "Guest" and The system should support basic text formatting options (bold, italic, bullet
points) for comments.

- **Email Notifications:**  
  The system will send email invitations when a PDF is shared via a unique link. This allows even non-registered users to access shared files securely through the invitation.

## 3. Features & Functional Specifications

### 3.1 User Management

- **Registration:**  
  Users register by providing their display name, email, and password. The display name is stored in the public profiles table via database triggers.
  
- **Authentication:**  
  Secure login is implemented using Supabase Auth along with support for password reset and account recovery.

### 3.2 File Upload & Storage

- **PDF Upload:**  
  Only PDF files are allowed. Files are validated by their MIME type and given a unique name before being stored.
  
- **Metadata:**  
  Once uploaded, a record with the file name, path, uploader’s user id, and share link is stored in the `pdfs` table.

### 3.3 PDF Viewing & Sharing

- **Dashboard:**  
  A searchable dashboard lists a user’s PDFs. Selecting a PDF opens a viewer (built with react-pdf) with pagination controls.
  
- **Sharing:**  
  A unique share link is generated for each PDF, allowing public (unauthenticated) users to view it via a dedicated shared view page.

### 3.4 Comments & Real-Time Collaboration

- **Commenting:**  
  Users and guests can add comments in a sidebar. Authenticated comments store the user’s ID and display the user’s display name from the profiles table; anonymous comments display “Guest”, and there are basic text formatting options (bold, italic, bullet
points) for comments. 
  
- **Real-Time Updates:**  
  Supabase Realtime features automatically update the comment view when new comments are added.

### 3.5 Email Notifications

- **Email Invitations:**  
  The system may send email invitations using the email service Emailjs.
## 4. Technical Architecture

### 4.1 Frontend

- **Framework:** React with react-router-dom for routing.
- **Styling:** Tailwind CSS.
- **PDF Rendering:** Using react-pdf.
- **Real-Time Features:** Leveraging Supabase Realtime.

#### Key Components:
- **PDFUploader.tsx:** Handles file selection, PDF validation, and uploading to Supabase Storage.
- **PDFView.tsx:** Renders the PDF with pagination and a comments sidebar for authenticated users.
- **SharedPDF.tsx:** Renders PDFs shared via unique links; supports guest commenting with display of user names from the profiles table.
- **Register.tsx:** Manages user registration and passes display name metadata to Supabase.

### 4.2 Backend / Cloud Services

- **Supabase:**  
  Acts as the backend, handling authentication, storage, database, and real-time subscriptions.
- **Public Profiles & Triggers:**  
  A public `profiles` table stores user display names and emails. Trigger functions on `auth.users` automatically maintain this table.
- **Email Service Integration (Optional):**  
  EmailJs to send email notifications.


## 5. Usage

### 5.1 Registration & Authentication

- **Registration:** Users register with their display name, email, and password. The display name is stored in the public profiles table via triggers on auth.users.
- **Login:** Standard login is implemented using Supabase Auth.


### 5.2 PDF Upload and Viewing
- **Upload:** Users upload PDFs through the PDFUploader component. Only files with PDF MIME type are allowed. Each file is stored in a Supabase Storage bucket, and its metadata is saved in the pdfs table.
- **Dashboard:** The dashboard provides a list of the user’s PDFs with search capability. Clicking a PDF opens the PDFView page, which includes a PDF viewer (using react-pdf) and a comments sidebar.

### 5.3 Sharing and Public Access
- **Share Link:** A unique share link is generated for each uploaded PDF. This link allows public (unauthenticated) and authenticated users to access the PDF via the SharedPDF page.
- **SharedPDF Page:** The public page allows external users to view the PDF and post comments. Comments are displayed along with the user’s display name from the profiles table (or “Guest” if the user isn’t authenticated).


### 5.4 Commenting & Real-Time Collaboration

- **Commenting:**  
  While viewing a PDF, users (or guests) can add comments via a sidebar.  
  - Their user ID is saved if an authenticated user posts a comment.  
  - When loading comments, the system fetches the corresponding display name from the public `profiles` table; otherwise, comments display “Guest.”
  - There are basic text formatting options (bold, italic, bullet
points) for comments. 

- **Real-Time Updates:**  
  The system uses Supabase’s real-time features to subscribe to new comment events and update the UI dynamically.

### 5.5 Email Notifications

- **Email Invitations:**  
  If enabled, when a user shares a PDF, the system can send email invitations using Emailjs.

## 6. Future Enhancements

### Future Enhancements

- **Enhanced Commenting:**  
  Enable replies to comments and support for rich text formatting.

- **Advanced Profile Management:**  
  Allow users to update their profiles, including profile pictures and additional details.

- **Email Customization:**  
  Expand the email invitation functionality with customizable templates and dynamic sender options.

