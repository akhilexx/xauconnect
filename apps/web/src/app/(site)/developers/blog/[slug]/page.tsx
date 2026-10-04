import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";
import { BlogArticle } from "@/components/developers/blog-article";
import { BLOG_BY_SLUG, BLOG_POSTS } from "@/lib/developers/blog-posts";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_BY_SLUG[slug];
  if (!post) return { title: "Blog" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_BY_SLUG[slug];
  if (!post) notFound();
  return (
    <DevDocsShell title={post.title} description={post.excerpt}>
      <BlogArticle post={post} />
    </DevDocsShell>
  );
}
