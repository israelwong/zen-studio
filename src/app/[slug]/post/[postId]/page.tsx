import { notFound } from "next/navigation";
import { getStudioPostById, incrementPostViewCount } from "@/lib/actions/studio/posts";
import { PostRenderer } from "@/components/posts/PostRenderer";

interface PublicPostPageProps {
  params: {
    slug: string;
    postId: string;
  };
}

export default async function PublicPostPage({ params }: PublicPostPageProps) {
  // Obtener el post
  const postResult = await getStudioPostById(params.postId);
  
  if (!postResult.success || !postResult.data) {
    notFound();
  }

  const post = postResult.data;

  // Verificar que el post esté publicado
  if (!post.is_published) {
    notFound();
  }

  // Incrementar contador de vistas (no bloquea la renderización)
  incrementPostViewCount(params.postId);

  return (
    <div className="min-h-screen bg-zinc-950">
      <PostRenderer post={post} studioSlug={params.slug} />
    </div>
  );
}
