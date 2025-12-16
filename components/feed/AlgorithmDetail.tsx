// components/feed/AlgorithmDetail.tsx
"use client";

export interface ExtendedAlgorithm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  is_public: boolean;
  is_official: boolean;
  author_id: string;
  weight_config: Record<string, number> | null;
  signal_descriptions: Record<string, string> | null;
  algorithm_config: Record<string, any> | null;
  install_count: number;
  rating: number | null;
  license_type: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  categories: Array<{
    category: {
      id: string;
      name: string;
      slug: string;
      icon: string | null;
      description: string | null;
    };
  }>;
}

export interface Revision {
  id: string;
  algorithm_id: string;
  version: string;
  changelog: string | null;
  created_at: string;
}

export interface SimilarAlgorithm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  install_count: number;
  rating: number | null;
  is_public: boolean;
  is_official: boolean;
  created_at: string;
  author: {
    display_name: string | null;
    username: string | null;
  };
}



import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sparkles,
  Users,
  Download,
  Zap,
  Trash2,
  Edit,
  Share,
  Star,
  Clock,
  Brain,
  Heart,
  MapPin,
  Hash,
  TrendingUp,
  Lock,
  Globe,
  Eye,
  BarChart,
  History,
  ExternalLink,
  Copy,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { FeedEngine } from '@/lib/feed-engine/engine';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const feedEngine = new FeedEngine();


interface AlgorithmDetailProps {
  algorithm: ExtendedAlgorithm;
  currentUserId?: string;
  isInstalled: boolean;
  isActive: boolean;
  isOwner: boolean;
  revisions?: Revision[];
  similarAlgorithms?: SimilarAlgorithm[];
}

export function AlgorithmDetail({ 
  algorithm, 
  currentUserId, 
  isInstalled, 
  isActive,
  isOwner,
  revisions = [],
  similarAlgorithms = []
}: AlgorithmDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleInstall = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to install algorithms');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      await feedEngine.installAlgorithm(currentUserId, algorithm.id);
      toast.success('Algorithm installed successfully');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to install algorithm');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to activate algorithms');
      return;
    }

    setLoading(true);
    try {
      await feedEngine.setActiveAlgorithm(currentUserId, algorithm.id);
      toast.success('Algorithm activated successfully');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate algorithm');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId || !isOwner) return;

    setLoading(true);
    
    try {
      await feedEngine.deleteAlgorithm(currentUserId, algorithm.id);
      toast.success('Algorithm deleted successfully');
      router.push('/algorithms');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete algorithm');
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/algorithms/${algorithm.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const getIconForCategory = (slug: string) => {
    switch (slug) {
      case 'chronological': return Clock;
      case 'social': return Users;
      case 'quality': return Brain;
      case 'wellbeing': return Heart;
      case 'local': return MapPin;
      case 'discovery': return Sparkles;
      case 'engagement': return TrendingUp;
      default: return Hash;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCopyConfig = () => {
    const config = {
      name: algorithm.name,
      description: algorithm.description,
      weight_config: algorithm.weight_config,
      signal_descriptions: algorithm.signal_descriptions,
      algorithm_config: algorithm.algorithm_config
    };
    
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.success('Configuration copied to clipboard');
  };

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">{algorithm.name}</h1>
            {algorithm.is_official ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                Official
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-300">
                Community
              </Badge>
            )}
          </div>
          
          <p className="text-muted-foreground text-lg mb-4">
            {algorithm.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={algorithm.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {algorithm.author?.display_name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">
                  {algorithm.author?.display_name || 'Anonymous'}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{algorithm.author?.username || 'user'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">{algorithm.rating?.toFixed(1) || 'N/A'}</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {algorithm.install_count?.toLocaleString() || 0} installs
            </div>
            
            <div className="text-sm text-muted-foreground">
              v{algorithm.version}
            </div>
            
            <Badge variant="outline" className="gap-1">
              {algorithm.license_type === 'personal' ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {algorithm.license_type || 'community'}
            </Badge>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {isOwner ? (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/algorithms/${algorithm.slug}/edit`)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : isActive ? (
            <Button disabled className="gap-2">
              <Zap className="h-4 w-4" />
              Active
            </Button>
          ) : isInstalled ? (
            <Button
              onClick={handleActivate}
              disabled={loading}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {loading ? 'Activating...' : 'Activate'}
            </Button>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={loading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Installing...' : 'Install'}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleShare}
            className="gap-2"
          >
            <Share className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Categories */}
      {algorithm.categories && algorithm.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {algorithm.categories.map(({ category }: any) => {
            const Icon = getIconForCategory(category.slug);
            return (
              <Badge key={category.id} variant="secondary" className="gap-2">
                <Icon className="h-3 w-3" />
                {category.name}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="font-medium">
                {formatDate(algorithm.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Updated</span>
              <span className="font-medium">
                {formatDate(algorithm.updated_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Visibility</span>
              <span className="font-medium">
                {algorithm.is_public ? 'Public' : 'Private'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Signal Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Signals</span>
              <span className="font-medium">
                {Object.keys(algorithm.signal_descriptions || {}).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Top Signal</span>
              <span className="font-medium capitalize">
                {(() => {
                  const weights = algorithm.weight_config || {};
                  const entries = Object.entries(weights);
                  if (entries.length === 0) return 'None';
                  const [topSignal] = entries.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
                  return topSignal.replace(/_/g, ' ');
                })()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Community
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Installations</span>
              <span className="font-medium">
                {algorithm.install_count?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Rating</span>
              <span className="font-medium flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                {algorithm.rating?.toFixed(1) || 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="signals" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="signals" className="gap-2">
            <Zap className="h-4 w-4" />
            Signals
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Brain className="h-4 w-4" />
            Advanced
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="revisions" className="gap-2">
              <History className="h-4 w-4" />
              Revisions
            </TabsTrigger>
          )}
        </TabsList>

        {/* Signal Details */}
        <TabsContent value="signals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Signal Configuration
                  </CardTitle>
                  <CardDescription>
                    How this algorithm weights different factors
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyConfig}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Config
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(algorithm.weight_config || {}).map(([signal, weight]) => (
                <div key={signal} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium capitalize">
                        {signal.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {algorithm.signal_descriptions?.[signal] || 'No description'}
                      </div>
                    </div>
                    <div className="text-lg font-bold">
                      {((weight as number) * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(weight as number) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Configuration */}
        <TabsContent value="advanced" className="space-y-6">
          {algorithm.algorithm_config ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Advanced Configuration
                </CardTitle>
                <CardDescription>
                  Fine-tuned parameters for content processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(algorithm.algorithm_config).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-2xl font-bold">
                        {typeof value === 'number' 
                          ? key.includes('Rate') || key.includes('Penalty') || key.includes('Threshold')
                            ? value.toFixed(2)
                            : value.toFixed(1)
                          : String(value)
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No advanced configuration found for this algorithm.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Revisions History (Owner only) */}
        {isOwner && (
          <TabsContent value="revisions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Revision History
                </CardTitle>
                <CardDescription>
                  Track changes made to your algorithm
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {revisions.length > 0 ? (
                  <div className="space-y-3">
                    {revisions.map((revision) => (
                      <div key={revision.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">Version {revision.version}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(revision.created_at)}
                          </div>
                        </div>
                        {revision.changelog && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {revision.changelog}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Revision ID: {revision.id.slice(0, 8)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No revisions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Revisions will appear here when you update your algorithm
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Similar Algorithms */}
      {similarAlgorithms && similarAlgorithms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Similar Algorithms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {similarAlgorithms.map((algo) => (
              <Card key={algo.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-1">
                          {algo.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          By {algo.author?.display_name || 'Community'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/algorithms/${algo.slug}`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Algorithm</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{algorithm.name}"? This action cannot be undone.
              {algorithm.install_count > 0 && (
                <div className="mt-2 text-destructive text-sm">
                  ⚠️ Warning: This algorithm is installed by {algorithm.install_count} user{algorithm.install_count !== 1 ? 's' : ''}.
                  Deleting it will remove it from all users' feeds.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Algorithm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}