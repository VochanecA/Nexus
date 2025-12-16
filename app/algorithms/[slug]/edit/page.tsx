// app/algorithms/[slug]/edit/page.tsx
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreateAlgorithmForm } from '@/components/feed/CreateAlgorithmForm';

interface EditAlgorithmPageProps {
  params: Promise<{ slug: string }>
}

export default async function EditAlgorithmPage({ params }: EditAlgorithmPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/algorithms');
  }

  // Get algorithm
  const { data: algorithm, error } = await supabase
    .from('feed_algorithms')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !algorithm) {
    notFound();
  }

  // Check if user owns the algorithm
  if (algorithm.author_id !== user.id) {
    redirect('/algorithms');
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Edit Algorithm</h1>
        <p className="text-muted-foreground">
          Update your algorithm settings and signals
        </p>
      </div>
      
      <CreateAlgorithmForm 
        userId={user.id} 
        mode="edit" 
        algorithmId={algorithm.id} 
      />
    </div>
  );
}