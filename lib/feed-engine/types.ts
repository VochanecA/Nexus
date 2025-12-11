// lib/feed-engine/types.ts
export interface FeedAlgorithm {
  id: string;
  name: string;
  slug: string;
  description: string;
  author_id?: string;
  is_official: boolean;
  is_public: boolean;
  version: string;
  algorithm_config: AlgorithmConfig;
  signal_descriptions: Record<string, string>;
  weight_config: Record<string, number>;
  install_count: number;
  rating: number;
  categories?: AlgorithmCategory[];
  created_at: string;
  updated_at: string;
}

export interface AlgorithmCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
}

export interface AlgorithmConfig {
  type: 'chronological' | 'social' | 'geographic' | 'ai_quality' | 'topical' | 'wellbeing' | 'custom';
  [key: string]: unknown;
}

export interface PostSignal {
  name: string;
  value: number;
  weight: number;
  description: string;
  explanation?: string;
}

export interface PostExplanation {
  post_id: string;
  total_score: number;
  signals: PostSignal[];
  algorithm_id: string;
  algorithm_name: string;
  summary: string;
}

export interface UserAlgorithmPreference {
  id: string;
  user_id: string;
  algorithm_id: string;
  algorithm: FeedAlgorithm;
  is_active: boolean;
  custom_config: Record<string, unknown>;
  priority: number;
}

export interface FeedRequest {
  userId?: string;
  algorithmSlug?: string;
  limit?: number;
  offset?: number;
  includeExplanations?: boolean;
  context?: {
    timeOfDay?: string;
    location?: { lat: number; lng: number };
    deviceType?: string;
  };
}

export interface PostData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}