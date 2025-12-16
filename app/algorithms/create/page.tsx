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
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Create Algorithm
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Design your own feed algorithm. Choose signals, set weights, and publish it for others to use.
        </p>
      </div>

      {/* Form wrapper */}
      <div className="max-w-3xl mx-auto">
        <div className="
          bg-background
          border
          rounded-xl
          shadow-sm
          p-4
          sm:p-6
        ">
          <CreateAlgorithmForm userId={user.id} />
        </div>
      </div>

      {/* Mobile bottom spacing (da forma ne upadne ispod MobileNavigation) */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
