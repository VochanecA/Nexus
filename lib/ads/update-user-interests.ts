// lib/ads/update-user-interests.ts
import { createClient } from '@/lib/supabase/client';

/**
 * Automatski update interesa na osnovu aktivnosti korisnika
 * Poziva se nakon svakih 10 novih like-ova ili jednom dnevno
 */
export async function updateUserInterests(userId: string): Promise<void> {
  const supabase = createClient();

  try {
    // Učitaj poslednjih 100 like-ova
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (likesError || !likes || likes.length === 0) {
      console.log('No likes found for user', userId);
      return;
    }

    // Učitaj hashtag-ove sa tih postova
    const postIds = likes.map(l => l.post_id);
    
    const { data: postHashtags, error: hashtagsError } = await supabase
      .from('post_hashtags')
      .select(`
        hashtag_id,
        hashtags (
          name,
          category
        )
      `)
      .in('post_id', postIds);

    if (hashtagsError) {
      console.error('Error fetching hashtags:', hashtagsError);
      return;
    }

    // Izračunaj score za svaki hashtag (češće = veći score)
    const hashtagCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    postHashtags?.forEach((ph: any) => {
      const hashtagName = ph.hashtags?.name;
      const category = ph.hashtags?.category;
      
      if (hashtagName) {
        hashtagCounts[hashtagName] = (hashtagCounts[hashtagName] || 0) + 1;
      }
      
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });

    // Normalizuj score-ove (0-1)
    const maxHashtagCount = Math.max(...Object.values(hashtagCounts), 1);
    const hashtagInterests: Record<string, number> = {};
    Object.entries(hashtagCounts).forEach(([tag, count]) => {
      hashtagInterests[tag] = count / maxHashtagCount;
    });

    const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);
    const categoryInterests: Record<string, number> = {};
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      categoryInterests[cat] = count / maxCategoryCount;
    });

    // Sačuvaj u bazu
    const { error: upsertError } = await supabase
      .from('user_interests')
      .upsert({
        user_id: userId,
        hashtag_interests: hashtagInterests,
        category_interests: categoryInterests,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error upserting user interests:', upsertError);
      return;
    }

    console.log(`✅ Updated interests for user ${userId}:`, {
      hashtags: Object.keys(hashtagInterests).length,
      categories: Object.keys(categoryInterests).length
    });

  } catch (error) {
    console.error('Error updating user interests:', error);
  }
}

/**
 * Pozovi ovu funkciju nakon što korisnik lajkuje post
 */
export async function onPostLiked(userId: string): Promise<void> {
  const supabase = createClient();

  try {
    // Proveri koliko like-ova ima korisnik
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Update interesa nakon svakih 10 like-ova
    if (count && count % 10 === 0) {
      await updateUserInterests(userId);
    }
  } catch (error) {
    console.error('Error in onPostLiked:', error);
  }
}

/**
 * Kreiraj Edge Function u Supabase za dnevni cron job
 * Putanja: supabase/functions/update-interests/index.ts
 */
export const cronJobExample = `
// supabase/functions/update-interests/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Dobavi sve korisnike koji su aktivni u poslednjih 30 dana
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activeUsers } = await supabase
      .from('likes')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const uniqueUserIds = [...new Set(activeUsers?.map(l => l.user_id) || [])]

    console.log(\`Updating interests for \${uniqueUserIds.length} users\`)

    // Update interesa za svakog korisnika
    for (const userId of uniqueUserIds) {
      await updateUserInterests(userId, supabase)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        usersUpdated: uniqueUserIds.length 
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

async function updateUserInterests(userId: string, supabase: any) {
  // Implementacija ista kao gore
  // ...
}
`;

/**
 * Dodaj ovu funkciju u svoj PostCard component kada se lajkuje post:
 * 
 * import { onPostLiked } from '@/lib/ads/update-user-interests';
 * 
 * const handleLike = async () => {
 *   // ... postojeći kod za like
 *   
 *   if (!liked && user) {
 *     await onPostLiked(user.id);
 *   }
 * };
 */