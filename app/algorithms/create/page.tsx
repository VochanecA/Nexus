// app/algorithms/create/page.tsx
import { CreateAlgorithmForm } from '@/components/feed/CreateAlgorithmForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CreateAlgorithmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/algorithms/create');
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Algorithm</h1>
        <p className="text-muted-foreground">
          Design your own feed algorithm. Choose signals, set weights, and publish for others to use.
        </p>
      </div>
      
      <CreateAlgorithmForm userId={user.id} />
    </div>
  );
}