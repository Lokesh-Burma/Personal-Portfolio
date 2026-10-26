import { randomUUID } from "node:crypto";
import { DynamoBlogsRepository } from "./blogs/dynamo-repository.ts";
import { BadRequestException, ConflictException } from "./blogs/errors.ts";
import type { Blog, BlogWrite } from "./blogs/types.ts";
import { localDemoEnabled, localState } from "./local-state.ts";
export type BlogStatus = "draft" | "published";
export type BlogPostInput = Partial<BlogWrite>;
export type DbBlogPost = Blog;
export function hasBlogDbConfig() { return Boolean(process.env.BLOG_TABLE_NAME || localDemoEnabled()); }
export function validateBlogInput(input: any): BlogWrite {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequestException("Expected a post object.");
  const allowed = ["title", "slug", "summary", "content_markdown", "cover_image", "tags", "status", "published_at"];
  if (Object.keys(input).some(k => !allowed.includes(k))) throw new BadRequestException("Unexpected post field.");
  for (const [key, max] of [["title",160],["content_markdown",200000],["slug",200],["summary",1800]] as const) {
    const value = input[key];
    if (value != null && (typeof value !== "string" || value.length > max)) throw new BadRequestException("Invalid " + key);
  }
  const title = input.title?.trim(), content = input.content_markdown?.trim();
  const slug = (input.slug || title || "").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  if (!title || !content || !slug) throw new BadRequestException("Title, slug and markdown are required.");
  if (input.status !== undefined && !["draft","published"].includes(input.status)) throw new BadRequestException("Invalid status.");
  if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 12 || input.tags.some((t: any) => typeof t !== "string" || t.length > 40))) throw new BadRequestException("Invalid tags.");
  const cover = input.cover_image;
  if (cover) { try { const u = new URL(cover); if (u.protocol !== "https:" || u.username || u.password) throw new Error(); } catch { throw new BadRequestException("Cover image must use HTTPS."); } }
  if (cover != null && typeof cover !== "string") throw new BadRequestException("Invalid cover image.");
  if (input.published_at != null && (typeof input.published_at !== "string" || !Number.isFinite(Date.parse(input.published_at)))) throw new BadRequestException("Invalid publication date.");
  return { title, slug, content_markdown: input.content_markdown, summary: input.summary?.trim() || null, cover_image: cover?.trim() || null, tags: input.tags?.map((t: string) => t.trim()).filter(Boolean) || [], status: input.status === "published" ? "published" : "draft", published_at: input.status === "published" ? input.published_at || new Date().toISOString() : null };
}
let cached: DynamoBlogsRepository | undefined;
function cloud() {
  if (process.env.AWS_REGION && process.env.AWS_REGION !== "ap-southeast-2") throw new Error("Unsupported region.");
  if (!process.env.BLOG_TABLE_NAME) throw new Error("BLOG_TABLE_NAME is required.");
  return cached ||= new DynamoBlogsRepository(process.env.BLOG_TABLE_NAME);
}
function local<T>(fn: (posts: Blog[]) => T) { return localState(s => fn(s.posts ||= [])); }
export async function listAdminPosts(): Promise<Blog[]> { return localDemoEnabled() ? local(p => p.slice().sort((a,b)=>b.updated_at.localeCompare(a.updated_at))) : cloud().listAdmin(); }
export async function listPublishedPosts(): Promise<Blog[]> { return localDemoEnabled() ? (await listAdminPosts()).filter(p=>p.status === "published").sort((a,b)=>(b.published_at || b.created_at).localeCompare(a.published_at || a.created_at)) : cloud().listPublished(); }
export async function getPublishedPostBySlug(slug: string) { return localDemoEnabled() ? local(p=>p.find(b=>b.slug===slug && b.status==="published") || null) : cloud().findPublishedBySlug(slug); }
export async function createPost(input: BlogPostInput) {
  const value = validateBlogInput(input);
  if (!localDemoEnabled()) return cloud().create(value);
  return local(p => { if (p.some(b=>b.slug===value.slug)) throw new ConflictException("Slug already exists."); const now=new Date().toISOString(); const post={...value,id:randomUUID(),created_at:now,updated_at:now}; p.push(post); return post; });
}
export async function updatePost(id: string, input: BlogPostInput) {
  if (!input || typeof input!=="object" || Array.isArray(input)) throw new BadRequestException("Expected a post object.");
  const previous = localDemoEnabled() ? await local(p=>p.find(b=>b.id===id)) : await cloud().findById(id);
  if (!previous) return null;
  const {id: _id, created_at: _c, updated_at: _u, ...old} = previous;
  const value = validateBlogInput({...old,...input});
  if (!localDemoEnabled()) return cloud().update(id,value);
  return local(p=>{const i=p.findIndex(b=>b.id===id);if(i<0)return null;if(p.some(b=>b.id!==id && b.slug===value.slug))throw new ConflictException("Slug already exists.");return p[i]={...p[i],...value,updated_at:new Date().toISOString()};});
}
export async function deletePost(id: string) { if (!localDemoEnabled()) return cloud().delete(id); await local(p=>{const i=p.findIndex(b=>b.id===id);if(i>=0)p.splice(i,1);return null;}); }
