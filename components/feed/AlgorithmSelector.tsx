// components/feed/AlgorithmSelector.tsx
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FeedEngine } from '@/lib/feed-engine/engine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  Users, 
  Brain, 
  Heart, 
  MapPin, 
  Hash, 
  Star, 
  Download,
  CheckCircle,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const feedEngine = new FeedEngine();

interface AlgorithmSelectorProps {
  userId?: string;
  onAlgorithmChange?: (algorithm: any) => void;
}

const categoryIcons = {
  chronological: Clock,
  social: Users,
  topical: Hash,
  'ai-optimized': Brain,
  wellbeing: Heart,
  local: MapPin,
};

export function AlgorithmSelector({ userId, onAlgorithmChange }: AlgorithmSelectorProps) {
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [userAlgorithms, setUserAlgorithms] = useState<any[]>([]);
  const [activeAlgorithm, setActiveAlgorithm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [userId]);

const loadData = async () => {
  setLoading(true);
  try {
    const [availableAlgos, userAlgos, activeAlgo] = await Promise.all([
      feedEngine.getAvailableAlgorithms({ officialOnly: true }),
      userId ? getUserAlgorithms() : Promise.resolve([]),
      userId ? feedEngine.getUserAlgorithm(userId) : feedEngine.getUserAlgorithm(),
    ]);

      setAlgorithms(availableAlgos || []);
      setUserAlgorithms(userAlgos || []);
      setActiveAlgorithm(activeAlgo);

      // Extract unique categories
      const cats = new Set();
      availableAlgos?.forEach((algo: any) => {
        algo.categories?.forEach((cat: any) => {
          cats.add(JSON.stringify(cat.category));
        });
      });
      setCategories(Array.from(cats).map(c => JSON.parse(c as string)));
    } catch (error) {
      console.error('Error loading algorithms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserAlgorithms = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_feed_algorithms')
      .select(`
        *,
        algorithms:feed_algorithms(*)
      `)
      .eq('user_id', userId);
    return data;
  };

  const handleInstall = async (algorithmId: string) => {
    if (!userId) {
      toast.error('Please sign in to install algorithms');
      return;
    }

    try {
      await feedEngine.installAlgorithm(userId, algorithmId);
      toast.success('Algorithm installed successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to install algorithm');
    }
  };

  const handleSetActive = async (algorithmId: string) => {
    if (!userId) {
      toast.error('Please sign in to change algorithms');
      return;
    }

    try {
      await feedEngine.setActiveAlgorithm(userId, algorithmId);
      const algorithm = algorithms.find(a => a.id === algorithmId);
      setActiveAlgorithm(algorithm);
      
      // Call the callback if provided
      if (algorithm && onAlgorithmChange) {
        onAlgorithmChange(algorithm);
      }
      
      toast.success('Feed algorithm updated');
    } catch (error) {
      toast.error('Failed to update algorithm');
    }
  };

  const filteredAlgorithms = activeCategory === 'all' 
    ? algorithms
    : algorithms.filter(algo => 
        algo.categories?.some((cat: any) => cat.category.slug === activeCategory)
      );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feed Algorithms</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Feed Algorithm</CardTitle>
            <CardDescription>
              Control what you see in your feed
            </CardDescription>
          </div>
          {activeAlgorithm && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                Active: {activeAlgorithm.name}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="installed">Installed ({userAlgorithms.length})</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory('all')}
                >
                  All Categories
                </Button>
                {categories.map((category) => {
                  const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] || Hash;
                  return (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.slug ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory(category.slug)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {category.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Algorithm Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAlgorithms.map((algorithm) => {
                const isInstalled = userAlgorithms.some(ua => ua.algorithm_id === algorithm.id);
                const isActive = activeAlgorithm?.id === algorithm.id;
                const Icon = categoryIcons[algorithm.categories?.[0]?.category?.slug as keyof typeof categoryIcons] || Hash;

                return (
                  <Card key={algorithm.id} className={isActive ? 'border-primary border-2' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{algorithm.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <span>By {algorithm.is_official ? 'Nexus' : 'Community'}</span>
                              {algorithm.is_official && (
                                <Badge variant="secondary" className="text-xs">Official</Badge>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm">{algorithm.rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-3">
                      <p className="text-sm text-muted-foreground mb-4">
                        {algorithm.description}
                      </p>
                      
                      {/* Signals used */}
                      <div className="mb-4">
                        <p className="text-xs font-medium mb-2">Uses these signals:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(algorithm.signal_descriptions || {}).slice(0, 3).map(signal => (
                            <Badge key={signal} variant="outline" className="text-xs capitalize">
                              {signal.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {Object.keys(algorithm.signal_descriptions || {}).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.keys(algorithm.signal_descriptions || {}).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>👥 {algorithm.install_count?.toLocaleString() || 0} installs</span>
                        <span>v{algorithm.version}</span>
                      </div>
                    </CardContent>
                    
                    <div className="px-6 pb-4">
                      <div className="flex gap-2">
                        {isActive ? (
                          <Button size="sm" className="w-full" disabled>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Active
                          </Button>
                        ) : isInstalled ? (
                          <Button 
                            size="sm" 
                            className="w-full" 
                            onClick={() => handleSetActive(algorithm.id)}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Activate
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="w-full" 
                            onClick={() => handleInstall(algorithm.id)}
                            disabled={!userId}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Install
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="installed">
            {userAlgorithms.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No algorithms installed yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse algorithms above to customize your feed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userAlgorithms.map((userAlgo) => (
                  <Card key={userAlgo.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {userAlgo.is_active && (
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          )}
                          <div>
                            <h4 className="font-medium">{userAlgo.algorithms.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {userAlgo.algorithms.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {userAlgo.is_active ? (
                            <Badge>Active</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSetActive(userAlgo.algorithm_id)}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeAlgorithm && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{activeAlgorithm.name}</CardTitle>
                      <CardDescription>
                        Currently controlling your feed
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">How it works:</h4>
                    <p className="text-sm text-muted-foreground">
                      {activeAlgorithm.description}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Signals used:</h4>
                    <div className="space-y-2">
                      {Object.entries(activeAlgorithm.signal_descriptions || {}).map(([signal, description]) => (
                        <div key={signal} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium capitalize">
                              {signal.replace(/_/g, ' ')}:
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {description as string}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Weights:</h4>
                    <div className="space-y-1">
                      {Object.entries(activeAlgorithm.weight_config || {}).map(([signal, weight]) => (
                        <div key={signal} className="flex items-center gap-2">
                          <span className="text-sm capitalize w-32">
                            {signal.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(weight as number) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs w-10 text-right">
                            {((weight as number) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}