// components/post/conversation-starter.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SuggestedReply {
  id: string;
  text: string;
  tone: 'friendly' | 'curious' | 'supportive' | 'analytical';
  votes: number;
}

interface ConversationStarterProps {
  postId: string;
  postContent: string;
}

export function ConversationStarter({ postId, postContent }: ConversationStarterProps) {
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([
    {
      id: '1',
      text: 'That\'s an interesting perspective! Could you elaborate more on this point?',
      tone: 'curious',
      votes: 12
    },
    {
      id: '2',
      text: 'I completely agree with this! Have you considered looking at it from this angle too?',
      tone: 'friendly',
      votes: 8
    },
    {
      id: '3',
      text: 'Thanks for sharing this insight. What evidence or experience led you to this conclusion?',
      tone: 'analytical',
      votes: 5
    },
    {
      id: '4',
      text: 'This is really helpful advice! How would you recommend someone get started with this?',
      tone: 'supportive',
      votes: 15
    }
  ]);

  const [selectedReply, setSelectedReply] = useState<string>('');
  const [userReply, setUserReply] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMoreReplies = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newReplies: SuggestedReply[] = [
      {
        id: Date.now().toString(),
        text: 'Fascinating take! How does this compare to traditional approaches?',
        tone: 'curious',
        votes: 0
      },
      {
        id: (Date.now() + 1).toString(),
        text: 'Appreciate you sharing this! What were the biggest challenges you faced?',
        tone: 'supportive',
        votes: 0
      }
    ];
    
    setSuggestedReplies(prev => [...newReplies, ...prev]);
    setIsGenerating(false);
  };

  const voteReply = (replyId: string, vote: 'up' | 'down') => {
    setSuggestedReplies(prev => prev.map(reply => 
      reply.id === replyId 
        ? { ...reply, votes: vote === 'up' ? reply.votes + 1 : Math.max(0, reply.votes - 1) }
        : reply
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'friendly': return 'bg-green-500/10 text-green-500';
      case 'curious': return 'bg-blue-500/10 text-blue-500';
      case 'supportive': return 'bg-purple-500/10 text-purple-500';
      case 'analytical': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Start a Conversation</CardTitle>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Not sure how to reply? Here are some AI-suggested conversation starters:
        </p>

        <div className="space-y-3">
          {suggestedReplies.map((reply) => (
            <div 
              key={reply.id}
              className={`rounded-lg border p-3 transition-all hover:border-primary/50 cursor-pointer ${
                selectedReply === reply.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedReply(reply.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary" className={getToneColor(reply.tone)}>
                  {reply.tone}
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      voteReply(reply.id, 'up');
                    }}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium">{reply.votes}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      voteReply(reply.id, 'down');
                    }}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm mb-2">{reply.text}</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(reply.text);
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserReply(reply.text);
                  }}
                >
                  <Send className="h-3 w-3" />
                  Use
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Textarea
            placeholder="Or write your own reply..."
            value={userReply}
            onChange={(e) => setUserReply(e.target.value)}
            className="min-h-[80px]"
          />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={generateMoreReplies}
              disabled={isGenerating}
            >
              <Sparkles className="mr-2 h-3 w-3" />
              {isGenerating ? 'Generating...' : 'More Suggestions'}
            </Button>
            <Button size="sm" className="flex-1" disabled={!userReply.trim()}>
              <Send className="mr-2 h-3 w-3" />
              Post Reply
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>💡 AI suggestions improve based on community votes and engagement patterns</p>
        </div>
      </CardContent>
    </Card>
  );
}