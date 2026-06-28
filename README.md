# Lokesh Burma Portfolio

Personal portfolio and technical writing site built with Next.js, TypeScript, and Tailwind CSS.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Add A Blog Post

Create a new file in `content/blog`:

```txt
content/blog/my-new-post.mdx
```

Use this structure:

```mdx
---
title: "My New Post"
date: "2026-06-28"
tags: ["Node.js", "AWS"]
summary: "One or two lines explaining what the post covers."
---

# My New Post

Write the post here.
```

The filename becomes the URL slug. For example:

```txt
content/blog/my-new-post.mdx
```

becomes:

```txt
/blog/my-new-post
```

## Add A Project

Create a new file in `content/projects`:

```mdx
---
title: "My Project"
stack: ["NestJS", "AWS", "Docker"]
summary: "Short project summary."
outcome: "The measurable result or learning."
---

# My Project

Write the case study here.
```

The site automatically reads all files from `content/blog` and `content/projects`.
