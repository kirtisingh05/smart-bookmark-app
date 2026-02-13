'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

type Bookmark = {
  id: string
  title: string
  url: string
  user_id: string
  created_at: string
}

export default function Home() {
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  /* ================= AUTH ================= */
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

    return () => subscription.unsubscribe()
  }, [])

  /* ================= FETCH + REALTIME ================= */
  useEffect(() => {
    if (!user) return

    const fetchBookmarks = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setBookmarks(data)
    }

    fetchBookmarks()

    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookmarks((prev) => [payload.new as Bookmark, ...prev])
          }

          if (payload.eventType === 'UPDATE') {
            setBookmarks((prev) =>
              prev.map((b) =>
                b.id === payload.new.id
                  ? (payload.new as Bookmark)
                  : b
              )
            )
          }

          if (payload.eventType === 'DELETE') {
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  /* ================= LOGIN / LOGOUT ================= */
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setBookmarks([])
  }

  /* ================= CREATE / UPDATE ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newTitle || !newUrl) return

    setIsSubmitting(true)

    try {
      if (editingId) {
        // UPDATE + return updated row
        const { data, error } = await supabase
          .from('bookmarks')
          .update({
            title: newTitle,
            url: newUrl,
          })
          .match({ id: editingId, user_id: user.id })
          .select()

        if (!error && data) {
          setBookmarks((prev) =>
            prev.map((b) =>
              b.id === editingId ? data[0] : b
            )
          )
        }

        setEditingId(null)
      } else {
        // INSERT + return inserted row
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({
            title: newTitle,
            url: newUrl,
            user_id: user.id,
          })
          .select()

        if (!error && data) {
          setBookmarks((prev) => [data[0], ...prev])
        }
      }

      setNewTitle('')
      setNewUrl('')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ================= EDIT / DELETE ================= */
  const startEdit = (bm: Bookmark) => {
    setEditingId(bm.id)
    setNewTitle(bm.title)
    setNewUrl(bm.url)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNewTitle('')
    setNewUrl('')
  }

  const deleteBookmark = async (id: string) => {
    if (!user) return
    const confirmDelete = confirm('Delete this bookmark?')
    if (!confirmDelete) return

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .match({ id, user_id: user.id })

    if (!error) {
      setBookmarks((prev) =>
        prev.filter((b) => b.id !== id)
      )
    }
  }

  /* ================= LOADING ================= */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
      </div>
    )

  return (
  <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">

    {/* ================= NOT LOGGED IN ================= */}
    {!user && (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="bg-white shadow-xl rounded-3xl p-12 max-w-md w-full border border-slate-200">

          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            🔖 SmartMarks
          </h1>

          <p className="text-slate-500 text-sm mb-8">
            Organize and access your favorite links beautifully.
          </p>

          <button
            onClick={handleLogin}
            className="bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium transition shadow-sm"
          >
            Continue with Google
          </button>
        </div>
      </div>
    )}

    {/* ================= LOGGED IN ================= */}
    {user && (
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              🔖 SmartMarks
            </h1>
            <p className="text-sm text-slate-500">
              Welcome back 👋
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-red-600 transition"
          >
            Sign Out
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 mb-10 hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-slate-700 mb-6">
            {editingId ? "Edit Bookmark" : "Add New Bookmark"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              required
            />

            <input
              type="url"
              placeholder="https://example.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              required
            />

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingId
                  ? "Update"
                  : "Add Bookmark"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        {bookmarks.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center text-slate-500">
            <div className="text-4xl mb-4">🔖</div>
            <p className="font-medium">No bookmarks yet</p>
            <p className="text-sm mt-1">
              Add your first bookmark above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bm) => (
              <div
                key={bm.id}
                className={`bg-white border border-slate-200 rounded-xl px-6 py-4 flex justify-between items-center hover:shadow-md transition ${
                  editingId === bm.id
                    ? "ring-2 ring-slate-900"
                    : ""
                }`}
              >
                <div className="overflow-hidden">
                  <a
                    href={bm.url}
                    target="_blank"
                    className="font-medium text-slate-800 hover:text-slate-900 truncate block"
                  >
                    {bm.title}
                  </a>
                  <p className="text-xs text-slate-400 truncate mt-1">
                    {bm.url}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(bm)}
                    disabled={
                      editingId !== null &&
                      editingId !== bm.id
                    }
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-40 transition"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => deleteBookmark(bm.id)}
                    className="text-slate-400 hover:text-red-600 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </main>
)

}
