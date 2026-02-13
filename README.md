# Smart Bookmark Manager

A real-time, secure bookmarking application built to demonstrate advanced full-stack capabilities with Next.js 14 and Supabase.

**Live URL:** [🔖 SmartMarks](https://smart-bookmark-app-two-psi.vercel.app)
**Repo:** [code](https://github.com/kirtisingh05/smart-bookmark-app/tree/main)

---

## 🚀 Features
* **Google OAuth Authentication:** Secure, passwordless login flow.
* **Real-time Synchronization:** Bookmarks appear instantly across tabs/devices using Supabase WebSockets (no page refresh).
* **Row Level Security (RLS):** Database-level security ensuring users can strictly access only their own data.
* **CRUD Operations:** Full ability to Create, Read, Update, and Delete bookmarks.
* **Modern UI:** Responsive glassmorphism design using Tailwind CSS.

## 🛠 Tech Stack
* **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
* **Backend:** Supabase (PostgreSQL, Auth, Realtime)
* **Deployment:** Vercel

---

## 🧠 Challenges & Solutions (Technical Deep Dive)

### 1. Challenge: Securing Real-time Data
**The Problem:** Initially, enabling "Realtime" on the `bookmarks` table broadcasted *every* change to *every* connected client. This meant User A could potentially receive an event when User B added a private bookmark, which is a massive privacy leak.

**The Solution:** I implemented **Row Level Security (RLS)** policies in PostgreSQL.
* I created a specific policy: `create policy "Enable access to own data" on bookmarks using (auth.uid() = user_id);`
* On the frontend, I passed a filter to the subscription: `filter: 'user_id=eq.${user.id}'`.
* This ensures the WebSocket channel only subscribes to events relevant to the authenticated user.

### 2. Challenge: OAuth Redirects in Different Environments
**The Problem:** Google OAuth requires a strict whitelist of redirect URIs. The authentication flow worked perfectly on `localhost`, but failed with a `400: redirect_uri_mismatch` error after deploying to Vercel because the production domain wasn't recognized.

**The Solution:** * I configured the Supabase "URL Configuration" to accept both `localhost:3000` and the Vercel production domain.
* I dynamically constructed the redirect URL in the code using `window.location.origin`, ensuring the app automatically uses the correct callback URL depending on whether it's running locally or in production.

### 3. Challenge: Database Permission for Updates
**The Problem:** While `SELECT` and `INSERT` worked fine, the "Edit" functionality was failing silently.

**The Solution:** I realized Supabase denies `UPDATE` operations by default even if the user is logged in. I had to explicitly write a separate RLS policy (`Users can update own bookmarks`) that checks `auth.uid() = user_id` for both the `USING` (row selection) and `WITH CHECK` (new data validation) clauses.

---

## 📦 Local Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/kirtisingh05/smart-bookmark-app
2. Install dependencies:
   ```bash
   npm install
   Set up environment variables in .env.local:

3. Code snippet
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
4. Run the development server:
   ```bash
   npm run dev
---
