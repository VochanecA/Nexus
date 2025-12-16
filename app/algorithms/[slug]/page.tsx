// app/algorithms/[slug]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AlgorithmDetail } from '@/components/feed/AlgorithmDetail';
import type {
  ExtendedAlgorithm,
  SimilarAlgorithm,
  Revision,
} from '@/components/feed/AlgorithmDetail';

/* =========================================================
   LOKALNI TIPOVI (bez Database / database.types)
   ========================================================= */

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

interface Algorithm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  is_public: boolean;
  is_official: boolean;
  author_id: string;
  weight_config: Record<string, number> | null;
  signal_descriptions: Record<string, string> | null;
  algorithm_config: Record<string, any> | null;
  install_count: number;
  rating: number | null;
  license_type: string | null;
  created_at: string;
  updated_at: string;
}

/* =========================================================
   PAGE PROPS
   ========================================================= */

interface AlgorithmPageProps {
  params: Promise<{ slug: string }>;
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function AlgorithmPage({ params }: AlgorithmPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch algorithm with author & categories
  const { data: algorithm, error } = await supabase
    .from('feed_algorithms')
    .select(
      `
      *,
      author:profiles!feed_algorithms_author_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        bio
      ),
      categories:feed_algorithm_categories_relations (
        category:feed_algorithm_categories (
          id,
          name,
          slug,
          icon,
          description
        )
      )
    `
    )
    .eq('slug', slug)
    .single();

  if (error || !algorithm) {
    notFound();
  }

  const typedAlgorithm = algorithm as ExtendedAlgorithm;

  // Private algorithm access check
  if (!typedAlgorithm.is_public && (!user || user.id !== typedAlgorithm.author_id)) {
    redirect('/algorithms');
  }

  // Check install / active state
  let isInstalled = false;
  let isActive = false;

  if (user) {
    const { data: userAlgorithm } = await supabase
      .from('user_feed_algorithms')
      .select('is_active')
      .eq('user_id', user.id)
      .eq('algorithm_id', typedAlgorithm.id)
      .maybeSingle();

    isInstalled = !!userAlgorithm;
    isActive = userAlgorithm?.is_active ?? false;
  }

  // Fetch revisions (owner only)
  let revisions: Revision[] = [];

  if (user && user.id === typedAlgorithm.author_id) {
    const { data } = await supabase
      .from('algorithm_revisions')
      .select('*')
      .eq('algorithm_id', typedAlgorithm.id)
      .order('created_at', { ascending: false })
      .limit(5);

    revisions = (data || []) as Revision[];
  }

  // Fetch similar algorithms
  const { data: similarAlgorithms } = await supabase
    .from('feed_algorithms')
    .select(
      `
      id,
      name,
      slug,
      description,
      version,
      install_count,
      rating,
      is_public,
      is_official,
      created_at,
      author:profiles!feed_algorithms_author_id_fkey (
        display_name,
        username
      )
    `
    )
    .eq('is_public', true)
    .neq('id', typedAlgorithm.id)
    .order('install_count', { ascending: false })
    .limit(4);

const typedSimilarAlgorithms: SimilarAlgorithm[] = (similarAlgorithms || []).map(
  (algo: any) => ({
    ...algo,
    author: Array.isArray(algo.author)
      ? algo.author[0] ?? { display_name: null, username: null }
      : algo.author,
  })
);


  return (
    <AlgorithmDetail
      algorithm={typedAlgorithm}
      currentUserId={user?.id}
      isInstalled={isInstalled}
      isActive={isActive}
      isOwner={user?.id === typedAlgorithm.author_id}
      revisions={revisions}
      similarAlgorithms={typedSimilarAlgorithms}
    />
  );
}
