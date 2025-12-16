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
  // Create new algorithm
  async createAlgorithm(userId: string, algorithmData: any) {
    const { data, error } = await this.supabase
      .from('feed_algorithms')
      .insert({
        ...algorithmData,
        author_id: userId,
        is_official: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    // Auto-install for creator
    await this.installAlgorithm(userId, data.id);
    
    return data;
  }

  // Update existing algorithm
  async updateAlgorithm(userId: string, algorithmId: string, updates: any) {
    // Check ownership
    const { data: existing } = await this.supabase
      .from('feed_algorithms')
      .select('author_id')
      .eq('id', algorithmId)
      .single();

    if (!existing || existing.author_id !== userId) {
      throw new Error('Not authorized to update this algorithm');
    }

    const { data, error } = await this.supabase
      .from('feed_algorithms')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', algorithmId)
      .select()
      .single();

    if (error) throw error;
    
    // Create revision
    await this.createRevision(algorithmId, data, userId);
    
    return data;
  }

  // Create revision history
  async createRevision(algorithmId: string, config: any, userId: string) {
    // Get current version
    const { data: algorithm } = await this.supabase
      .from('feed_algorithms')
      .select('version')
      .eq('id', algorithmId)
      .single();

    const { error } = await this.supabase
      .from('algorithm_revisions')
      .insert({
        algorithm_id: algorithmId,
        version: algorithm?.version || '1.0.0',
        config_snapshot: config,
        changelog: 'Algorithm updated',
        created_by: userId,
        created_at: new Date().toISOString()
      });

    if (error) console.error('Error creating revision:', error);
  }

  // Delete algorithm
  async deleteAlgorithm(userId: string, algorithmId: string) {
    // Check ownership
    const { data: existing } = await this.supabase
      .from('feed_algorithms')
      .select('author_id, is_official')
      .eq('id', algorithmId)
      .single();

    if (!existing || existing.author_id !== userId) {
      throw new Error('Not authorized to delete this algorithm');
    }

    if (existing.is_official) {
      throw new Error('Cannot delete official algorithms');
    }

    // First, uninstall from all users
    await this.supabase
      .from('user_feed_algorithms')
      .delete()
      .eq('algorithm_id', algorithmId);

    // Delete algorithm
    const { error } = await this.supabase
      .from('feed_algorithms')
      .delete()
      .eq('id', algorithmId);

    if (error) throw error;
    
    return { success: true };
  }

  // Get algorithm by slug
  async getAlgorithmBySlug(slug: string, userId?: string) {
    const { data: algorithm, error } = await this.supabase
      .from('feed_algorithms')
      .select(`
        *,
        author:profiles!feed_algorithms_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        categories:feed_algorithm_categories_relations (
          category:feed_algorithm_categories (
            id,
            name,
            slug,
            icon
          )
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;

    // Check visibility
    if (!algorithm.is_public && (!userId || userId !== algorithm.author_id)) {
      throw new Error('Algorithm is private');
    }

    return algorithm;
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

