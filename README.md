# Smart Bookmark Manager

A real-time bookmark manager built with Next.js 14 (App Router), Supabase, and Tailwind CSS.

**Live URL:** [LINK](https://smart-bookmark-app-two-psi.vercel.app/)]

## Features
- **Google OAuth Login:** Secure passwordless authentication.
- **Private Bookmarks:** Users can only access and manage their own data.
- **Real-time Updates:** Bookmarks appear instantly across tabs without refreshing.
- **Responsive Design:** Styled with Tailwind CSS.

## Tech Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Deployment:** Vercel

## Challenges & Solutions

### 1. Handling Real-time Data Security
**Problem:** Enabling Realtime on the `bookmarks` table initially broadcasted *all* database changes to every connected user. This meant User A could potentially receive an event when User B added a bookmark.
**Solution:** I utilized PostgreSQL Row Level Security (RLS) policies.
- I created a policy: `create policy "Enable access to own data" on bookmarks using (auth.uid() = user_id);`
- In the frontend `supabase.channel` subscription, I added a filter: `filter: 'user_id=eq.${user.id}'`.
This ensures the WebSocket only receives events relevant to the logged-in user.

### 2. Managing OAuth Redirects
**Problem:** Google OAuth requires strict whitelisting of redirect URIs. The authentication flow worked locally (`localhost:3000`) but failed after deployment with a 400 error.
**Solution:** - I configured Supabase "URL Configuration" to include both `localhost` and the production Vercel domain.
- In the `signInWithOAuth` method, I used `window.location.origin` to dynamically determine the correct redirect URL based on the environment (Dev vs. Prod).

### 3. Next.js App Router & Auth State
**Problem:** Managing authentication state in the new App Router structure can be tricky between Server Components and Client Components.
**Solution:** I created a dedicated `useClient` hook and wrapped the main dashboard logic in a `useEffect` that listens to `supabase.auth.onAuthStateChange`. This ensures the UI stays in sync if the user logs out or their session expires.
