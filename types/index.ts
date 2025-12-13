// types/index.ts

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null
  content_hash: string;
  signature: string;
  provenance: Record<string, any>;
  created_at: string;
  updated_at?: string;
  
  // Podaci o profilu korisnika
  profiles?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  
  // Agregirani podaci
  likes_count?: number;
  comments_count?: number;
  has_liked?: boolean;
}