// components/post/ProvenanceBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Bot, Edit, Repeat } from "lucide-react";

interface ProvenanceBadgeProps {
  provenance: any;
  postId: string;
}

export function ProvenanceBadge({ provenance, postId }: ProvenanceBadgeProps) {
  const verifyProvenance = () => {
    // Jednostavna klijentska verifikacija
    if (!provenance) return 'unknown';
    
    const { authorId, contentHash, signature } = provenance;
    
    // Proveri signature format
    if (signature?.startsWith('nexus-sig-')) {
      return 'verified';
    }
    
    return 'unverified';
  };

  const status = verifyProvenance();
  const isAI = provenance?.metadata?.isAIgenerated;
  const isRepost = provenance?.metadata?.originalPostId;
  const isEdit = provenance?.metadata?.editOf;

  return (
    <div className="flex flex-wrap gap-1">
      {/* Status badge */}
      {status === 'verified' && (
        <Badge variant="outline" className="text-xs gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Verified Source
        </Badge>
      )}
      
      {/* AI generated */}
      {isAI && (
        <Badge variant="outline" className="text-xs gap-1 bg-amber-50">
          <Bot className="h-3 w-3 text-amber-600" />
          AI Generated
        </Badge>
      )}
      
      {/* Repost */}
      {isRepost && (
        <Badge variant="outline" className="text-xs gap-1">
          <Repeat className="h-3 w-3 text-blue-500" />
          Repost
        </Badge>
      )}
      
      {/* Edit */}
      {isEdit && (
        <Badge variant="outline" className="text-xs gap-1">
          <Edit className="h-3 w-3 text-purple-500" />
          Edited
        </Badge>
      )}
    </div>
  );
}