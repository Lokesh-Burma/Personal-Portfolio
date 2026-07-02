# Blog API Setup

The app has a DB-backed blog API and an admin editor at `/admin`.

## Recommended Hosting

- Host the Next.js frontend and API routes on Vercel.
- Host the database on Supabase Postgres.
- Store secrets in Vercel environment variables.

This keeps the API close to the frontend, avoids a separate backend service, and gives you Postgres plus backups through Supabase.

## Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/blogs.sql`.
3. Copy the project URL and service-role key.

## Environment Variables

Set these in `.env.local` for local development and in Vercel project settings for production:

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD_HASH="pbkdf2:210000:salt:hash"
ADMIN_SESSION_SECRET="a-long-random-secret"
```

For local-only development, `ADMIN_PASSWORD` is accepted when `ADMIN_PASSWORD_HASH` is not set. Do not use `ADMIN_PASSWORD` in production.

Generate a production password hash with:

```bash
pnpm hash-password
```

## API

Public:

- `GET /api/blogs`
- `GET /api/blogs/[slug]`

Admin:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/blogs`
- `POST /api/admin/blogs`
- `PATCH /api/admin/blogs/[id]`
- `DELETE /api/admin/blogs/[id]`

Admin post payload:

```json
{
  "title": "Post title",
  "slug": "post-title",
  "summary": "Short summary",
  "content_markdown": "# Markdown body",
  "cover_image": "https://example.com/image.jpg",
  "tags": ["backend", "postgres"],
  "status": "draft"
}
```
