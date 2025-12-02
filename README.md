# Anchor

Anchor is an offline‑first, self‑hostable note‑taking application. It focuses on speed, privacy, simplicity, and reliability across mobile and web. Notes are stored locally, editable offline, and synced across devices when online.  

This repository includes:  
- Mobile App (Flutter)  
- Web App (Next.js)  
- Backend Server (Nest.js)  
- PostgreSQL database  
- Docker Compose for self‑hosting  

---

## Features (MVP)

- Create, edit, delete notes  
- Rich text formatting (bold, italic, underline, headings, lists, checkboxes)  
- Pin and archive notes  
- Color‑coded notes  
- Search notes locally and remotely  
- Offline‑first support with local storage  
- Automatic sync when online  
- Conflict resolution (last‑write‑wins)  
- Secure login with JWT  
- Self‑hostable with Docker  

---

## Tech Stack

### Mobile (Flutter)
- Flutter (latest stable)
- Riverpod (state management and DI)
- Drift (local offline database)
- Dio (network client)
- json_serializable (data models)
- connectivity_plus (online/offline detection)
- GoRouter (navigation)
- Flutter Quill (rich text editor)

### Web (Next.js)
- Next.js (App Router)
- React 18
- React Query (server state management and sync)
- IndexedDB (offline data storage)
- Service Worker for PWA offline mode
- TypeScript
- Zustand or React Context (local UI state)
- Quill.js or Tiptap (rich text editor for web)

### Backend (Nest.js)
- Nest.js (modular server framework)
- Prisma (ORM)
- PostgreSQL (database)
- JWT authentication
- REST API endpoints
- Class Validator (input validation)
- Helmet and rate limiting (security)
- Docker support

### Deployment & DevOps
- Docker  
- Docker Compose  
- Nginx reverse proxy (optional)  
- Environment‑based configuration  
- Docker volumes for persistent data  

---

## Project Structure

```
anchor/
├── mobile/        Flutter app
├── web/           Next.js web app
├── server/        Nest.js backend
├── docker/        Docker Compose and configs
├── docs/          Documentation
└── README.md
```

---

## Getting Started

### Prerequisites
- Git  
- Docker and Docker Compose  
- Node.js (for web and server development)  
- Flutter SDK (for mobile development)  

---

## Self‑Hosting With Docker

1. Clone the project:
   ```
   git clone https://github.com/yourusername/anchor.git
   cd anchor
   ```

2. Copy environment variable templates:
   - `server/.env.example` → `server/.env`
   - `web/.env.example` → `web/.env`

   Set:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - API URLs for web and mobile

3. Start the stack:
   ```
   docker-compose up --build
   ```

4. Access the services:
   - API Server: http://localhost:3000
   - Web App: http://localhost:4000

---

## Platform Details

### Offline and Sync Strategy

- Drift (mobile) and IndexedDB (web) store notes locally.  
- All edits work offline.  
- Sync is triggered automatically on connectivity change or at periodic intervals.  
- Conflicts use last‑write‑wins logic.  

---

## Roadmap

Future planned features (not in MVP):

- Media attachments (images, PDFs, recordings)  
- Labels and tags  
- Reminders and notifications  
- End‑to‑end encryption  
- Real‑time collaboration  
- Multi‑user shared notes  
- Browser extension  

---

## Contributing

1. Fork the repository  
2. Create a feature branch:
   ```
   git checkout -b feature/your-feature
   ```
3. Commit changes:
   ```
   git commit -m "Describe your change"
   ```
4. Push and create a Pull Request  

---

## License

Anchor will be released under an open‑source license.  
License information will be added soon.
