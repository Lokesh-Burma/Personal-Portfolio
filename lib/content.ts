import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  body: string;
};

export type Project = {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
  outcome: string;
  body: string;
};

export type CheatSheet = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  tools: string[];
  body: string;
};

type ContentKind = "blog" | "projects" | "cheatsheets";

const contentRoot = path.join(process.cwd(), "content");

const blogPriority: Record<string, number> = {
  "ai-writes-code-role-of-backend-developer": 0,
  "security-best-practices-production-workloads": 1,
  "zero-downtime-data-migration-patterns": 2,
  "debugging-distributed-backup-systems": 3,
  "understanding-how-this-frontend-portfolio-app-works": 4,
  "from-php-monolith-to-microservices": 5,
};

function parseFrontmatter(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { data: {}, body: source.trim() };
  }

  const data = Object.fromEntries(
    match[1]
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        return [key, parseValue(rawValue)];
      }),
  );

  return { data, body: match[2].trim() };
}

function parseValue(value: string) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }

  return value.replace(/^"|"$/g, "");
}

function readContentFile(kind: ContentKind, slug: string) {
  const filePath = path.join(contentRoot, kind, `${slug}.mdx`);
  const raw = readFileSync(filePath, "utf8");
  return parseFrontmatter(raw);
}

function getSlugs(kind: ContentKind) {
  return readdirSync(path.join(contentRoot, kind))
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

function getBlogRank(slug: string) {
  return blogPriority[slug] ?? 100;
}

export function getAllBlogPosts(): BlogPost[] {
  return getSlugs("blog")
    .map((slug) => getBlogPost(slug))
    .sort((a, b) => {
      const priorityDiff = getBlogRank(a.slug) - getBlogRank(b.slug);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return b.date.localeCompare(a.date);
    });
}

export function getBlogPost(slug: string): BlogPost {
  const { data, body } = readContentFile("blog", slug);
  return {
    slug,
    title: String(data.title),
    date: String(data.date),
    summary: String(data.summary),
    tags: Array.isArray(data.tags) ? data.tags : [],
    body,
  };
}

export function getAllProjects(): Project[] {
  return getSlugs("projects").map((slug) => getProject(slug));
}

export function getProject(slug: string): Project {
  const { data, body } = readContentFile("projects", slug);
  return {
    slug,
    title: String(data.title),
    summary: String(data.summary),
    stack: Array.isArray(data.stack) ? data.stack : [],
    outcome: String(data.outcome ?? ""),
    body,
  };
}

export function getAllCheatSheets(): CheatSheet[] {
  return getSlugs("cheatsheets")
    .map((slug) => getCheatSheet(slug))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getCheatSheet(slug: string): CheatSheet {
  const { data, body } = readContentFile("cheatsheets", slug);
  return {
    slug,
    title: String(data.title),
    category: String(data.category),
    summary: String(data.summary),
    tools: Array.isArray(data.tools) ? data.tools : [],
    body,
  };
}
