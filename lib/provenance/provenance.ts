// lib/provenance/provenance.ts
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/client';

export class ProvenanceService {
  static generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  static async signPost(
    postId: string, 
    userId: string, 
    content: string,
    metadata: {
      isAIgenerated: boolean;
      originalPostId?: string; // Ako je repost
      editOf?: string; // Ako je edit
    }
  ) {
    const supabase = createClient();
    
    // 1. Dohvati prethodni post od istog autora (za chain)
    const { data: previousPost } = await supabase
      .from('posts')
      .select('content_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // 2. Generiši hash sadržaja
    const contentHash = this.generateContentHash(content);
    
    // 3. Kreiraj provenance objekt
    const provenance = {
      version: '1.0',
      authorId: userId,
      timestamp: new Date().toISOString(),
      previousHash: previousPost?.content_hash || null,
      contentHash,
      metadata: {
        ...metadata,
        algorithm: 'SHA-256',
        platform: 'nexus'
      },
      signature: await this.generateSignature(userId, contentHash)
    };
    
    return provenance;
  }

  private static async generateSignature(userId: string, hash: string): Promise<string> {
    // Koristi Supabase Edge Functions za bezbedno potpisivanje
    // Ili JWT token korisnika
    return `nexus-sig-${userId}-${hash.substring(0, 16)}`;
  }
}