// lib/utils/view-tracker.ts
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from 'uuid';

interface TrackViewParams {
  postId: string;
  userId?: string | null; // ← PROMENITE OVO
  metadata?: {
    ip?: string | null; // ← PROMENITE OVO
    userAgent?: string | null; // ← PROMENITE OVO
    referrer?: string | null; // ← PROMENITE OVO
  };
}

export class ViewTracker {
  private static instance: ViewTracker;
  private viewsMap = new Map<string, boolean>();
  private sessionId: string;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastTracked = new Map<string, number>();

  private constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  static getInstance(): ViewTracker {
    if (!ViewTracker.instance) {
      ViewTracker.instance = new ViewTracker();
    }
    return ViewTracker.instance;
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return uuidv4();
    
    let sessionId = localStorage.getItem('nexus_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('nexus_session_id', sessionId);
    }
    return sessionId;
  }

  async trackView({
    postId,
    userId = null, // ← DODAJTE DEFAULT
    metadata = {}
  }: TrackViewParams): Promise<boolean> {
    try {
      // Rate limiting: max 1 view per post per 10 sekundi
      const now = Date.now();
      const lastTrackedTime = this.lastTracked.get(postId) || 0;
      if (now - lastTrackedTime < 10000) {
        return false;
      }

      const supabase = createClient();
      
      const viewKey = `${postId}_${this.sessionId}`;
      if (this.viewsMap.has(viewKey)) {
        return false;
      }

      // Debounce
      if (this.debounceTimers.has(postId)) {
        clearTimeout(this.debounceTimers.get(postId));
      }

      return new Promise((resolve) => {
        this.debounceTimers.set(postId, setTimeout(async () => {
          try {
            // Proveri da li već postoji view u ovoj sesiji
            const { data: existingView } = await supabase
              .from('post_views')
              .select('id')
              .eq('post_id', postId)
              .eq('session_id', this.sessionId)
              .maybeSingle();

            if (existingView) {
              this.viewsMap.set(viewKey, true);
              this.lastTracked.set(postId, now);
              resolve(false);
              return;
            }

            // Pripremi podatke za view
            const viewData: any = {
              post_id: postId,
              session_id: this.sessionId,
              user_agent: metadata.userAgent || null,
              referrer: metadata.referrer || null,
              ip_address: metadata.ip || null
            };

            // Dodaj user_id samo ako postoji
            if (userId && userId !== 'null' && userId !== 'undefined') {
              viewData.user_id = userId;
            }

            // Insert view
            const { error } = await supabase
              .from('post_views')
              .insert(viewData);

            if (error) {
              console.error('Error tracking view:', error);
              resolve(false);
              return;
            }

            this.viewsMap.set(viewKey, true);
            this.lastTracked.set(postId, now);
            
            // Ažuriraj views_count na postu
            await this.incrementPostViews(postId);
            
            resolve(true);
          } catch (error) {
            console.error('Error in trackView:', error);
            resolve(false);
          }
        }, 500)); // 500ms debounce
      });
    } catch (error) {
      console.error('Error in trackView:', error);
      return false;
    }
  }

 private async incrementPostViews(postId: string): Promise<void> {
  try {
    const supabase = createClient();
    
    // Prvo pokušajte da dobijete trenutni broj pregleda
    const { data: postData, error: fetchError } = await supabase
      .from('posts')
      .select('views_count')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching post views:', fetchError);
      return;
    }

    const currentViews = postData?.views_count || 0;
    
    // Ažurirajte views_count direktno
    const { error: updateError } = await supabase
      .from('posts')
      .update({ views_count: currentViews + 1 })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post views:', updateError);
    } else {
      console.log(`✅ Views incremented for post ${postId}: ${currentViews} → ${currentViews + 1}`);
    }
  } catch (error) {
    console.error('Error incrementing post views:', error);
  }
}

  clearSession(): void {
    this.viewsMap.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.lastTracked.clear();
    
    this.sessionId = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_session_id', this.sessionId);
    }
  }
}

export const viewTracker = ViewTracker.getInstance();