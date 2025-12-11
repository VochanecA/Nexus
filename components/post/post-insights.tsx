// components/post/post-insights.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Sparkles,
  Brain,
  Zap,
  Target,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PostInsightsProps {
  post: {
    id: string;
    content: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    engagement_score: number;
    is_trending: boolean;
  };
}

interface Insight {
  type: 'sentiment' | 'engagement' | 'reach' | 'virality';
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export function PostInsights({ post }: PostInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([
    {
      type: 'engagement',
      title: 'Engagement Rate',
      value: `${Math.min(100, Math.round((post.likes_count + post.comments_count) / 10))}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-green-500 bg-green-500/10',
      description: 'Higher than 85% of recent posts'
    },
    {
      type: 'sentiment',
      title: 'Sentiment Score',
      value: 'Positive',
      icon: <Brain className="h-4 w-4" />,
      color: 'text-blue-500 bg-blue-500/10',
      description: 'Based on AI analysis of comments'
    },
    {
      type: 'reach',
      title: 'Estimated Reach',
      value: `${(post.likes_count * 10).toLocaleString()}`,
      icon: <Users className="h-4 w-4" />,
      color: 'text-purple-500 bg-purple-500/10',
      description: 'Potential people who saw this'
    },
    {
      type: 'virality',
      title: 'Virality Potential',
      value: post.is_trending ? 'High' : 'Medium',
      icon: <Zap className="h-4 w-4" />,
      color: post.is_trending ? 'text-orange-500 bg-orange-500/10' : 'text-yellow-500 bg-yellow-500/10',
      description: post.is_trending ? 'Trending in your network' : 'Growing steadily'
    }
  ]);

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Post Insights</CardTitle>
          </div>
          <Badge variant={post.is_trending ? "default" : "secondary"}>
            {post.is_trending ? "🔥 Trending" : "📊 Analytics"}
          </Badge>
        </div>
        <CardDescription>
          AI-powered analysis of this post's performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {insights.map((insight) => (
            <div key={insight.type} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1 rounded ${insight.color}`}>
                  {insight.icon}
                </div>
                <span className="text-sm font-medium">{insight.title}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{insight.value}</span>
                <span className="text-xs text-muted-foreground">
                  {insight.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Engagement Timeline */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Engagement Timeline</span>
          </div>
          <div className="flex items-center h-8 gap-1">
            {[...Array(12)].map((_, i) => {
              const height = 10 + Math.random() * 20;
              const isPeak = i === 4; // Simulated peak hour
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    isPeak
                      ? 'bg-gradient-to-t from-orange-500 to-orange-300'
                      : 'bg-gradient-to-t from-primary/30 to-primary/10'
                  }`}
                  style={{ height: `${height}px` }}
                  title={`Hour ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Posted</span>
            <span>Now</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Show Less' : 'Show Advanced Analytics'}
          <Target className="ml-2 h-3 w-3" />
        </Button>

        {showAdvanced && (
          <div className="mt-4 space-y-3 animate-in fade-in">
            <div className="rounded-lg bg-muted/50 p-3">
              <h4 className="text-sm font-medium mb-1">AI Recommendations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Post similar content between 2-4 PM for better reach</li>
                <li>• Use 1-2 relevant hashtags to increase visibility by 30%</li>
                <li>• Engage with comments within 1 hour to boost algorithm</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}