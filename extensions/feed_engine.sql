-- extensions/feed_engine.sql

-- Feed algorithm plugins table
CREATE TABLE IF NOT EXISTS public.feed_algorithms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  is_official BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  version VARCHAR(20) DEFAULT '1.0.0',
  algorithm_config JSONB NOT NULL DEFAULT '{}',
  signal_descriptions JSONB NOT NULL DEFAULT '{}', -- { "signal_name": "description" }
  weight_config JSONB NOT NULL DEFAULT '{}', -- { "signal_name": weight }
  min_version VARCHAR(20),
  max_version VARCHAR(20),
  install_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User algorithm preferences
CREATE TABLE IF NOT EXISTS public.user_feed_algorithms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  algorithm_id UUID REFERENCES public.feed_algorithms(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  custom_config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, algorithm_id)
);

-- Algorithm signals logging (for explainability)
CREATE TABLE IF NOT EXISTS public.feed_signal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  algorithm_id UUID REFERENCES public.feed_algorithms(id) ON DELETE CASCADE,
  signals JSONB NOT NULL, -- { "signal_name": value, "weight": value }
  total_score DECIMAL(10,4),
  explanation JSONB NOT NULL DEFAULT '{}', -- Human-readable explanation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed algorithm categories
CREATE TABLE IF NOT EXISTS public.feed_algorithm_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50)
);

-- Many-to-many: algorithms to categories
CREATE TABLE IF NOT EXISTS public.feed_algorithm_categories_relations (
  algorithm_id UUID REFERENCES public.feed_algorithms(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.feed_algorithm_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (algorithm_id, category_id)
);

-- Pre-populate with default algorithms
INSERT INTO public.feed_algorithm_categories (id, name, slug, description, icon) VALUES
  (gen_random_uuid(), 'Chronological', 'chronological', 'Time-based sorting', 'Clock'),
  (gen_random_uuid(), 'Social', 'social', 'Based on social connections', 'Users'),
  (gen_random_uuid(), 'Topical', 'topical', 'Content-based relevance', 'Hash'),
  (gen_random_uuid(), 'AI Optimized', 'ai-optimized', 'Machine learning algorithms', 'Brain'),
  (gen_random_uuid(), 'Wellbeing', 'wellbeing', 'Focus on mental health', 'Heart'),
  (gen_random_uuid(), 'Local', 'local', 'Local content focus', 'MapPin');

-- Default algorithms
INSERT INTO public.feed_algorithms (id, name, slug, description, is_official, algorithm_config, signal_descriptions, weight_config) VALUES
  -- 1. Chronological
  (
    gen_random_uuid(),
    'Chronological',
    'chronological',
    'Posts shown in reverse chronological order. Pure time-based sorting.',
    true,
    '{"type": "chronological", "max_age_hours": 168, "boost_new": false}'::jsonb,
    '{"time_recency": "How recently the post was created", "user_recency": "When you last interacted with the author"}'::jsonb,
    '{"time_recency": 1.0}'::jsonb
  ),
  
  -- 2. Social Graph
  (
    gen_random_uuid(),
    'Friends First',
    'friends-first',
    'Prioritize posts from people you follow and interact with most.',
    true,
    '{"type": "social", "max_follow_depth": 2, "include_friends_of_friends": true, "engagement_weight": 0.7}'::jsonb,
    '{"follow_level": "How closely connected you are to the author", "engagement_history": "Your past interactions with this author", "mutual_connections": "Number of mutual friends"}'::jsonb,
    '{"follow_level": 0.4, "engagement_history": 0.4, "mutual_connections": 0.2}'::jsonb
  ),
  
  -- 3. Local News Focus
  (
    gen_random_uuid(),
    'Local Lens',
    'local-lens',
    'Focus on content from your local area and community news.',
    true,
    '{"type": "geographic", "radius_km": 50, "boost_local_business": true, "include_regional_news": true}'::jsonb,
    '{"geographic_distance": "Physical distance from your location", "local_relevance": "Mentions of local places/events", "community_engagement": "Local discussion around the post"}'::jsonb,
    '{"geographic_distance": 0.5, "local_relevance": 0.3, "community_engagement": 0.2}'::jsonb
  ),
  
  -- 4. AI Anti-Clickbait
  (
    gen_random_uuid(),
    'Quality Filter',
    'quality-filter',
    'AI-powered filter that reduces clickbait and low-quality content.',
    true,
    '{"type": "ai_quality", "min_quality_score": 0.3, "demote_clickbait": true, "promote_substance": true}'::jsonb,
    '{"content_quality": "AI assessment of content depth and value", "clickbait_score": "Likelihood of being sensationalist", "reading_time": "Estimated time to read fully", "source_credibility": "Author/source reputation"}'::jsonb,
    '{"content_quality": 0.4, "clickbait_score": 0.3, "reading_time": 0.2, "source_credibility": 0.1}'::jsonb
  ),
  
  -- 5. Topic Explorer
  (
    gen_random_uuid(),
    'Topic Explorer',
    'topic-explorer',
    'Discover new topics based on your interests and trending discussions.',
    true,
    '{"type": "topical", "exploration_rate": 0.3, "personal_interests": true, "trend_aware": true}'::jsonb,
    '{"topic_match": "Alignment with your stated interests", "trending_score": "Current popularity of the topic", "novelty": "How different from your usual content", "diversity": "Variety of perspectives shown"}'::jsonb,
    '{"topic_match": 0.3, "trending_score": 0.3, "novelty": 0.2, "diversity": 0.2}'::jsonb
  ),
  
  -- 6. Wellbeing Focus
  (
    gen_random_uuid(),
    'Mindful Feed',
    'mindful-feed',
    'Prioritizes positive, constructive content for better digital wellbeing.',
    true,
    '{"type": "wellbeing", "sentiment_min": 0.2, "reduce_controversy": true, "promote_constructive": true, "time_limits": true}'::jsonb,
    '{"sentiment_score": "Overall positivity of content", "constructiveness": "How constructive/helpful the discussion is", "stress_level": "Estimated emotional impact", "time_appropriateness": "Suitability for current time of day"}'::jsonb,
    '{"sentiment_score": 0.3, "constructiveness": 0.3, "stress_level": 0.2, "time_appropriateness": 0.2}'::jsonb
  );

-- RLS Policies
ALTER TABLE public.feed_algorithms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feed_algorithms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_signal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_algorithm_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_algorithm_categories_relations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public algorithms are viewable by everyone" 
  ON public.feed_algorithms FOR SELECT 
  USING (is_public = true OR is_official = true);

CREATE POLICY "Users can view their own algorithm preferences" 
  ON public.user_feed_algorithms FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own algorithm preferences" 
  ON public.user_feed_algorithms FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own signal logs" 
  ON public.feed_signal_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_feed_algorithms_slug ON public.feed_algorithms(slug);
CREATE INDEX idx_user_feed_algorithms_user ON public.user_feed_algorithms(user_id);
CREATE INDEX idx_feed_signal_logs_user_post ON public.feed_signal_logs(user_id, post_id);
CREATE INDEX idx_feed_algorithms_rating ON public.feed_algorithms(rating DESC);
CREATE INDEX idx_feed_algorithms_install_count ON public.feed_algorithms(install_count DESC);