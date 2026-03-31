# NeoMed Collaborative Editor

A lightweight, collaborative document editor built for the AI-Native Full Stack Developer assignment.

## Features
- **Document Management**: Create, rename, delete, and view documents.
- **Rich-Text Editing**: A professional editing experience with Bold, Italic, **Underline**, Headings, and Lists.
- **File Interoperability**: Upload `.txt` or `.md` files to automatically create new documents.
- **Sharing & Permissions**: Role-based access control (Owner, Editor, Viewer).
- **History & Collaboration**: Version history restore, presence indicators, and document-level commenting/suggestions.
- **Exporting**: Export to Markdown or Print to PDF.
- **Responsiveness**: Fully responsive UI for mobile, tablet, and desktop views.

## Demo
https://github.com/user-attachments/assets/5ae5ee14-1eb4-4011-bfb9-bd8f0c4ae6fc

## Tech Stack
- **Frontend**: React 19, Tailwind CSS v4, TipTap (Editor).
- **Backend**: Node.js/Express.
- **Database**: SQLite with Prisma ORM.
- **Authentication**: Simple demo login (select user to proceed).

## Setup & Running Locally

### Prerequisites
- Node.js (v18+)
- npm

### 1. Clone & Install
```bash
# In the root and both subdirectories
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Database Setup
```bash
cd backend
npx prisma db push
npm run seed
```

### 3. Run Development Servers
You will need two terminal windows open:
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 4. Open in Browser
Visit `http://localhost:5173` to start using the app.

## Testing
To run the automated backend tests:
```bash
cd backend
npm test
```

## API Endpoints

The backend API is organized into several logical categories for document management, user management, and collaboration.

### **1. Documents** (`/documents`)
The core category for document lifecycle and collaborative features.

| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/documents` | Create a new document |
| `GET` | `/documents/my` | Get all documents owned by the current user |
| `GET` | `/documents/shared` | Get all documents shared with the current user |
| `GET` | `/documents/:id` | Get a specific document by ID (includes access role) |
| `PUT` | `/documents/:id` | Update document content and title |
| `DELETE` | `/documents/:id` | Delete a document (Owner only) |
| `GET` | `/documents/:id/versions` | List version history snapshots |
| `POST` | `/documents/:id/versions/:vId/restore` | Restore document to a previous version |
| `GET` | `/documents/:id/comments` | List all comments and suggestions |
| `POST` | `/documents/:id/comments` | Add a comment or suggestion |
| `POST` | `/documents/:id/comments/:cId/resolve` | Mark a comment as resolved |
| `POST` | `/documents/:id/presence/heartbeat` | Send status to show active user presence |
| `GET` | `/documents/:id/presence` | Get list of currently active users |
| `GET` | `/documents/:id/export/markdown` | Export current content as a Markdown string |

### **2. Users** (`/users`)
Used for simulated login and user identification.

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/users` | List all available users in the system |

### **3. Sharing** (`/share`)
Handles permissions and role-based access control.

| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/share` | Share a document (assign `VIEWER`, `COMMENTER`, or `EDITOR`) |
| `GET` | `/share/users` | Retrieve user list for the sharing modal |

### **4. File Uploads** (`/upload`)

| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/upload` | Upload a `.txt` or `.md` file to create a new document |
