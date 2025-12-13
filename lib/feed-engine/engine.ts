// lib/feed-engine/engine.ts
import { createClient } from '@/lib/supabase/client';
import { 
  FeedAlgorithm, 
  PostExplanation, 
  FeedRequest,
  PostSignal
} from './types';

export class FeedEngine {
  private supabase = createClient();
  
  // Get active algorithm for user (or default)
  async getUserAlgorithm(userId?: string): Promise<FeedAlgorithm> {
    if (!userId) {
      // Default algorithm for non-logged in users
      const { data } = await this.supabase
        .from('feed_algorithms')
        .select('*')
        .eq('slug', 'chronological')
        .single();
      
      return data as FeedAlgorithm;
    }
    
    // Get user's active algorithm
    const { data: userAlgo } = await this.supabase
      .from('user_feed_algorithms')
      .select(`
        *,
        algorithms:feed_algorithms(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1)
      .single();
    
    if (userAlgo?.algorithms) {
      return userAlgo.algorithms as FeedAlgorithm;
    }
    
    // Fallback to chronological
    const { data } = await this.supabase
      .from('feed_algorithms')
      .select('*')
      .eq('slug', 'chronological')
      .single();
    
    return data as FeedAlgorithm;
  }
  
  // Get available algorithms with filtering
  async getAvailableAlgorithms(options?: {
    categorySlug?: string;
    officialOnly?: boolean;
    search?: string;
    limit?: number;
  }) {
    let query = this.supabase
      .from('feed_algorithms')
      .select(`
        *,
        categories:feed_algorithm_categories_relations(
          category:feed_algorithm_categories(*)
        )
      `)
      .eq('is_public', true);
    
    if (options?.officialOnly) {
      query = query.eq('is_official', true);
    }
    
    if (options?.categorySlug) {
      query = query.contains('categories', [{ category: { slug: options.categorySlug } }]);
    }
    
    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data } = await query.order('install_count', { ascending: false });
    return data;
  }
  
  // Install algorithm for user
  async installAlgorithm(userId: string, algorithmId: string, customConfig?: any) {
    const { data, error } = await this.supabase
      .from('user_feed_algorithms')
      .upsert({
        user_id: userId,
        algorithm_id: algorithmId,
        is_active: true,
        custom_config: customConfig || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,algorithm_id'
      });
    
    if (!error) {
      // Increment install count
      await this.supabase.rpc('increment', {
        table_name: 'feed_algorithms',
        id: algorithmId,
        column: 'install_count'
      });
    }
    
    return { data, error };
  }
  
  // Uninstall algorithm
  async uninstallAlgorithm(userId: string, algorithmId: string) {
    const { error } = await this.supabase
      .from('user_feed_algorithms')
      .delete()
      .eq('user_id', userId)
      .eq('algorithm_id', algorithmId);
    
    if (!error) {
      // Decrement install count
      await this.supabase.rpc('decrement', {
        table_name: 'feed_algorithms',
        id: algorithmId,
        column: 'install_count'
      });
    }
    
    return { error };
  }
  
  // Set active algorithm
  async setActiveAlgorithm(userId: string, algorithmId: string) {
    // First, deactivate all user algorithms
    await this.supabase
      .from('user_feed_algorithms')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    // Activate selected one
    const { error } = await this.supabase
      .from('user_feed_algorithms')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('algorithm_id', algorithmId);
    
    return { error };
  }
  
  // Rate algorithm
  async rateAlgorithm(userId: string, algorithmId: string, rating: number) {
    // Note: This is a simplified version. In production, you'd want a separate ratings table.
    const { error } = await this.supabase
      .from('algorithm_ratings')
      .upsert({
        user_id: userId,
        algorithm_id: algorithmId,
        rating,
        updated_at: new Date().toISOString()
      });
    
    return { error };
  }
}