// components/feed/ExplanationPanel.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  X, 
  TrendingUp, 
  Clock, 
  Users, 
  Brain,
  Shield,
  Heart
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ExplanationPanelProps {
  postId: string;
  explanation?: {
    algorithm_name: string;
    total_score: number;
    signals: Array<{
      name: string;
      value: number;
      weight: number;
      description: string;
    }>;
    summary: string;
  };
  onClose?: () => void;
}

const signalIcons: Record<string, any> = {
  time_recency: Clock,
  follow_level: Users,
  engagement_history: Users,
  mutual_connections: Users,
  content_quality: Brain,
  clickbait_score: Shield,
  reading_time: Clock,
  source_credibility: Shield,
  sentiment_score: Heart,
  constructiveness: Heart,
  stress_level: Heart,
  geographic_distance: 'Pin',
  local_relevance: 'Pin',
};

export function ExplanationPanel({ postId, explanation, onClose }: ExplanationPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!explanation) return null;

  const totalScorePercent = Math.min(Math.round(explanation.total_score * 100), 100);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Why you're seeing this post</h4>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Algorithm:</span>
            <span className="font-medium">{explanation.algorithm_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Overall relevance:</span>
            <span className="font-medium">{totalScorePercent}%</span>
          </div>
          <Progress value={totalScorePercent} className="h-2" />
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          {explanation.summary}
        </p>
        
        {expanded ? (
          <div className="space-y-3">
            <h5 className="text-sm font-medium">Detailed breakdown:</h5>
            {explanation.signals.map((signal, index) => {
              const Icon = signalIcons[signal.name] || TrendingUp;
              const contribution = Math.round(signal.value * signal.weight * 100);
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {typeof Icon === 'string' ? (
                        <span className="h-4 w-4 flex items-center justify-center text-xs">
                          {Icon}
                        </span>
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="capitalize">
                        {signal.name.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-medium">{contribution}%</span>
                  </div>
                  <div className="pl-6">
                    <p className="text-xs text-muted-foreground mb-1">
                      {signal.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${signal.value * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Value: {(signal.value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${signal.weight * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Weight: {(signal.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-sm"
            onClick={() => setExpanded(true)}
          >
            <Info className="h-3 w-3" />
            Show detailed explanation
          </Button>
        )}
        
        {expanded && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 gap-2 text-sm"
            onClick={() => setExpanded(false)}
          >
            <X className="h-3 w-3" />
            Show less
          </Button>
        )}
      </CardContent>
    </Card>
  );
}