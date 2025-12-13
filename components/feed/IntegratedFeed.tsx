// components/feed/IntegratedFeed.tsx
"use client";

import { useState } from 'react';
import { Feed, AlgorithmFeed } from '@/components/feed'; // Uklonite ExplanationPanel ako ne postoji
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Users, Clock } from 'lucide-react';

interface IntegratedFeedProps {
  userId: string;
  followingUserIds?: string[];
  showFollowButton?: boolean;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  isAuthenticated?: boolean; // DODAJTE OVO
}

export function IntegratedFeed({
  userId,
  followingUserIds = [],
  showFollowButton = true,
  onFollowChange,
  isAuthenticated = true, // DODAJTE OVO
}: IntegratedFeedProps) {

  const [feedType, setFeedType] = useState<'algorithm' | 'following' | 'chronological'>('algorithm');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={feedType} onValueChange={(v) => setFeedType(v as typeof feedType)}>
          <TabsList>
            <TabsTrigger value="algorithm" className="gap-2">
              <Brain className="h-4 w-4" />
              Algorithm
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <Users className="h-4 w-4" />
              Following
            </TabsTrigger>
            <TabsTrigger value="chronological" className="gap-2">
              <Clock className="h-4 w-4" />
              Latest
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TabsContent value="algorithm" className="mt-0">
        <AlgorithmFeed
          userId={userId}
        />
      </TabsContent>
      
      <TabsContent value="following" className="mt-0">
        <Feed
          userId={userId}
          followingUserIds={followingUserIds}
          isAuthenticated={isAuthenticated} // DODAJTE OVO
          showFollowButton={showFollowButton}
          onFollowChange={onFollowChange}
        />
      </TabsContent>

      <TabsContent value="chronological" className="mt-0">
        <Feed
          userId={userId}
          followingUserIds={[]}
          isAuthenticated={isAuthenticated} // DODAJTE OVO
          showFollowButton={showFollowButton}
          onFollowChange={onFollowChange}
        />
      </TabsContent>
    </div>
  );
}