// components/feed/IntegratedFeed.tsx
"use client";

import { useState } from 'react';
import { Feed } from '@/components/feed/feed';
import { AlgorithmFeed } from '@/components/feed/AlgorithmFeed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Users, Clock } from 'lucide-react';

interface IntegratedFeedProps {
  currentUserId?: string;
  initialPosts?: any[];
  variant?: 'default' | 'compact' | 'detailed';
}

export function IntegratedFeed({
  currentUserId,
  initialPosts = [],
  variant = 'default'
}: IntegratedFeedProps) {
  const [feedType, setFeedType] = useState<'algorithm' | 'following' | 'chronological'>('algorithm');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={feedType} onValueChange={(v) => setFeedType(v as typeof feedType)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="algorithm" className="gap-2 rounded-full">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Algorithm</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2 rounded-full">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
            </TabsTrigger>
            <TabsTrigger value="chronological" className="gap-2 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Latest</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4">
        <TabsContent value="algorithm" className="mt-0">
          <AlgorithmFeed
            userId={currentUserId}
          />
        </TabsContent>
        
        <TabsContent value="following" className="mt-0">
          <Feed
            currentUserId={currentUserId}
            initialPosts={initialPosts}
            variant={variant}
            filter="following"
            showTabs={false}
          />
        </TabsContent>

        <TabsContent value="chronological" className="mt-0">
          <Feed
            currentUserId={currentUserId}
            initialPosts={initialPosts}
            variant={variant}
            filter="all"
            showTabs={false}
          />
        </TabsContent>
      </div>
    </div>
  );
}