"use client";

import Link from "next/link";
import {signOutOwner} from "@/lib/auth/client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { MAX_TECHCANVAS_IMPORT_BYTES, parseTechCanvasDraft } from "@/lib/techcanvas-import";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content_markdown: string;
  cover_image: string | null;
  tags: string[];
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

type BlogPostForm = {
  title: string;
  slug: string;
  summary: string;
  content_markdown: string;
  cover_image: string;
  tags: string;
  status: "draft" | "published";
};

const emptyPost: BlogPostForm = {
  title: "",
  slug: "",
  summary: "",
  content_markdown: "",
  cover_image: "",
  tags: "",
  status: "draft",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authMode,setAuthMode]=useState("pending");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPost);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const preserveImportedForm = useRef(false);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedId) || null,
    [posts, selectedId],
  );

  async function loadPosts() {
    const response = await fetch("/api/admin/blogs");
    if (response.status === 401) {
      setAuthenticated(false);
      return;
    }
    const data = await response.json();
    setPosts(data.posts || []);
  }

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((session) => {
        setAuthMode(session.authMode || "cognito");
        setAuthenticated(session.authenticated);
        if (session.authenticated) {
          setEmail(session.email || "");
          loadPosts();
        }
      });
  }, []);

  useEffect(() => {
    if (preserveImportedForm.current) {
      preserveImportedForm.current = false;
      return;
    }
    if (!selectedPost) {
      setForm(emptyPost);
      return;
    }

    setForm({
      title: selectedPost.title,
      slug: selectedPost.slug,
      summary: selectedPost.summary || "",
      content_markdown: selectedPost.content_markdown,
      cover_image: selectedPost.cover_image || "",
      tags: selectedPost.tags?.join(", ") || "",
      status: selectedPost.status,
    });
  }, [selectedPost]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setBusy(false);
    if (!response.ok) {
      setMessage("Login failed.");
      return;
    }

    setPassword("");
    window.dispatchEvent(new Event("owner-session-changed"));
    setAuthenticated(true);
    await loadPosts();
  }

  async function savePost(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    const response = await fetch(selectedId ? `/api/admin/blogs/${selectedId}` : "/api/admin/blogs", {
      method: selectedId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Save failed.");
      return;
    }

    setMessage("Saved.");
    setSelectedId(data.post.id);
    await loadPosts();
  }

  async function removePost() {
    if (!selectedId || !confirm("Delete this post?")) return;
    setBusy(true);

    const response = await fetch(`/api/admin/blogs/${selectedId}`, { method: "DELETE" });
    setBusy(false);

    if (!response.ok) {
      setMessage("Delete failed.");
      return;
    }

    setSelectedId(null);
    setMessage("Deleted.");
    await loadPosts();
  }

  function exportPostsBackup() {
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),posts},null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="portfolio-posts-export-"+new Date().toISOString().slice(0,10)+".json";link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }

  async function importTechCanvasDraft(file: File) {
    if (file.size > MAX_TECHCANVAS_IMPORT_BYTES) {
      setMessage("Choose a TechCanvas JSON export smaller than 256 KB.");
      return;
    }
    if ((form.title || form.content_markdown) && !confirm("Replace the editor content with this TechCanvas draft?")) return;
    setBusy(true);
    try {
      const draft = parseTechCanvasDraft(await file.text());
      preserveImportedForm.current = selectedPost !== null;
      setSelectedId(null);
      setForm(draft);
      setMessage("Imported for review. Save when ready; this starts as an unpublished draft.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import this file.");
    } finally { setBusy(false); }
  }

  async function logout(){try{await signOutOwner();}catch(error){setMessage((error as Error).message);}}

  if(!authenticated && authMode!=="local-demo")return <main className="mx-auto min-h-[60vh] max-w-xl px-5 py-20"><h1 className="text-3xl font-semibold">Owner workspace</h1><p className="my-5 text-muted">{authMode==="pending"?"Checking your session…":"One MFA-protected sign-in covers the blog editor and TechCanvas."}</p>{authMode!=="pending" && <Link href="/login?returnTo=%2Fadmin" className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink">Continue to owner sign-in</Link>}</main>;

  if (!authenticated) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md flex-col justify-center px-5 py-16">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-accent-soft">Local demo · password only</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
        <form onSubmit={login} className="mt-8 space-y-4">
          <input
            className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
            type="email"
            aria-label="Email"
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
            type="password"
            aria-label="Password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-red-600">{message}</p> : null}
      </main>
    );
  }

  return (
    <main className="border-t border-line bg-canvas">
      <div className="mx-auto min-h-[calc(100vh-72px)] w-full max-w-7xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-accent-soft">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Blog editor</h1>
            <p className="mt-1 text-sm text-subtle">{email}</p>
          </div>
          <button className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-semibold text-muted" onClick={logout}>
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            <button
              className="w-full rounded-md bg-accent px-4 py-2 text-left text-sm font-semibold text-accent-ink"
              onClick={() => { setSelectedId(null); setForm(emptyPost); }}
            >
              New post
            </button>
            <label className="block rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-ink">
              Import TechCanvas draft
              <input className="mt-3 block w-full text-xs font-normal" type="file" accept="application/json,.json" disabled={busy} onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void importTechCanvasDraft(file);
              }} />
              <span className="mt-2 block text-xs font-normal leading-5 text-subtle">Choose portfolio.json from your content pack. Review before saving.</span>
            </label>
            <button type="button" onClick={exportPostsBackup} disabled={busy} className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-left text-xs text-muted">Export posts backup (includes drafts)</button>
            {posts.map((post) => (
              <button
                key={post.id}
                className={`w-full rounded-lg border bg-panel px-4 py-3 text-left text-sm shadow-sm transition ${
                  post.id === selectedId ? "border-accent" : "border-line"
                }`}
                onClick={() => setSelectedId(post.id)}
              >
                <span className="block font-semibold text-ink">{post.title}</span>
                <span className="mt-1 block text-xs text-subtle">{post.status}</span>
              </button>
            ))}
          </aside>

          <form onSubmit={savePost} className="space-y-4 rounded-lg border border-line bg-panel p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-muted">
                <span>Title</span>
                <input
                  className="w-full rounded-md border border-line px-3 py-2"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                      slug: current.slug || slugify(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-muted">
                <span>Slug</span>
                <input
                  className="w-full rounded-md border border-line px-3 py-2"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm font-medium text-muted">
              <span>Summary</span>
              <textarea
                className="min-h-20 w-full rounded-md border border-line px-3 py-2"
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-muted">
                <span>Cover image URL</span>
                <input
                  className="w-full rounded-md border border-line px-3 py-2"
                  value={form.cover_image}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cover_image: event.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-muted">
                <span>Tags</span>
                <input
                  className="w-full rounded-md border border-line px-3 py-2"
                  placeholder="backend, postgres, systems"
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm font-medium text-muted">
              <span>Status</span>
              <select
                className="rounded-md border border-line px-3 py-2"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as "draft" | "published",
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="block space-y-1 text-sm font-medium text-muted">
              <span>Markdown</span>
              <textarea
                className="min-h-[420px] w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                value={form.content_markdown}
                onChange={(event) =>
                  setForm((current) => ({ ...current, content_markdown: event.target.value }))
                }
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink" disabled={busy}>
                {busy ? "Saving..." : "Save"}
              </button>
              {selectedId ? (
                <button
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600"
                  type="button"
                  onClick={removePost}
                  disabled={busy}
                >
                  Delete
                </button>
              ) : null}
              {message ? <p className="text-sm text-subtle">{message}</p> : null}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
