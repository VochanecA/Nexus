// components/feed/CreateAlgorithmForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown,
  Zap,
  Clock,
  Users,
  Hash,
  Brain,
  Heart,
  MapPin,
  Globe,
  Lock,
  Sparkles,
  Tag,
  TrendingUp,
  Star,
  Eye,
  Save,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SIGNAL_TYPES = [
  { id: 'time_recency', name: 'Time Recency', icon: Clock, description: 'How recently the post was created', category: 'temporal' },
  { id: 'follow_level', name: 'Follow Level', icon: Users, description: 'Connection level with author', category: 'social' },
  { id: 'engagement_history', name: 'Engagement History', icon: Users, description: 'Past interactions with author', category: 'social' },
  { id: 'content_quality', name: 'Content Quality', icon: Brain, description: 'Depth and substance of content', category: 'quality' },
  { id: 'clickbait_score', name: 'Clickbait Score', icon: Brain, description: 'Likelihood of being sensationalist', category: 'quality' },
  { id: 'sentiment_score', name: 'Sentiment', icon: Heart, description: 'Positivity/negativity of content', category: 'quality' },
  { id: 'geographic_distance', name: 'Geographic Distance', icon: MapPin, description: 'Physical distance from you', category: 'location' },
  { id: 'topic_match', name: 'Topic Match', icon: Hash, description: 'Alignment with your interests', category: 'content' },
  { id: 'hashtag_match', name: 'Hashtag Match', icon: Tag, description: 'Matching hashtags you follow', category: 'content' },
  { id: 'trending_score', name: 'Trending Score', icon: TrendingUp, description: 'Current popularity of content', category: 'engagement' },
  { id: 'engagement_rate', name: 'Engagement Rate', icon: Zap, description: 'Likes/comments relative to views', category: 'engagement' },
  { id: 'post_length', name: 'Post Length', icon: Brain, description: 'Optimal length for engagement', category: 'quality' },
];

const CATEGORIES = [
  { id: 'chronological', name: 'Chronological', icon: Clock, description: 'Sort by time' },
  { id: 'social', name: 'Social', icon: Users, description: 'Focus on relationships' },
  { id: 'quality', name: 'Quality', icon: Star, description: 'Focus on content quality' },
  { id: 'wellbeing', name: 'Wellbeing', icon: Heart, description: 'Mental health focused' },
  { id: 'local', name: 'Local', icon: MapPin, description: 'Geographically relevant' },
  { id: 'discovery', name: 'Discovery', icon: Sparkles, description: 'New content discovery' },
  { id: 'engagement', name: 'Engagement', icon: TrendingUp, description: 'High engagement content' },
  { id: 'custom', name: 'Custom', icon: Wand2, description: 'User defined algorithm' },
];

const LICENSE_TYPES = [
  { id: 'personal', name: 'Personal Use', icon: Lock, description: 'Only you can use this algorithm' },
  { id: 'community', name: 'Community License', icon: Users, description: 'Anyone can use and modify' },
  { id: 'open_source', name: 'Open Source', icon: Globe, description: 'MIT license, free for all' },
  { id: 'attribution', name: 'Attribution Required', icon: Eye, description: 'Can be used with credit' },
];

interface SignalConfig {
  id: string;
  weight: number;
  description: string;
  customName?: string;
}

interface CreateAlgorithmFormProps {
  userId: string;
  mode?: 'create' | 'edit';
  algorithmId?: string;
}

export function CreateAlgorithmForm({ userId, mode = 'create', algorithmId }: CreateAlgorithmFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [licenseType, setLicenseType] = useState('community');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['custom']);
  
  // Signal Configuration
  const [signals, setSignals] = useState<SignalConfig[]>([
    { id: 'time_recency', weight: 0.3, description: 'How recently the post was created' },
    { id: 'follow_level', weight: 0.4, description: 'Connection level with author' },
    { id: 'content_quality', weight: 0.3, description: 'Depth and substance of content' },
  ]);
  
  // Advanced Settings
  const [advancedSettings, setAdvancedSettings] = useState({
    timeDecayRate: 0.95,
    freshnessBoost: 1.5,
    friendMultiplier: 2.0,
    maxAgeDays: 7,
    diversityPenalty: 0.8,
    minScoreThreshold: 0.1,
  });

  // Load existing algorithm for edit mode
  useEffect(() => {
    if (mode === 'edit' && algorithmId) {
      loadAlgorithm();
    }
  }, [mode, algorithmId]);

  const loadAlgorithm = async () => {
    const supabase = createClient();
    try {
      const { data: algorithm, error } = await supabase
        .from('feed_algorithms')
        .select('*')
        .eq('id', algorithmId)
        .single();

      if (error) throw error;

      if (algorithm.author_id !== userId) {
        toast.error('You can only edit your own algorithms');
        router.push('/algorithms');
        return;
      }

      setName(algorithm.name);
      setDescription(algorithm.description);
      setIsPublic(algorithm.is_public);
      setLicenseType(algorithm.license_type || 'community');
      
      // Load categories
      const { data: categories } = await supabase
        .from('feed_algorithm_categories_relations')
        .select('category_id')
        .eq('algorithm_id', algorithmId);

      if (categories) {
        setSelectedCategories(categories.map(c => c.category_id));
      }

      // Load signals from weight_config
      if (algorithm.weight_config) {
        const signalConfigs: SignalConfig[] = Object.entries(algorithm.weight_config).map(([id, weight]) => {
          const signal = SIGNAL_TYPES.find(s => s.id === id);
          return {
            id,
            weight: weight as number,
            description: algorithm.signal_descriptions?.[id] || signal?.description || '',
          };
        });
        setSignals(signalConfigs);
      }

      // Load advanced settings
      if (algorithm.algorithm_config) {
        setAdvancedSettings({
          timeDecayRate: algorithm.algorithm_config.timeDecayRate || 0.95,
          freshnessBoost: algorithm.algorithm_config.freshnessBoost || 1.5,
          friendMultiplier: algorithm.algorithm_config.friendMultiplier || 2.0,
          maxAgeDays: algorithm.algorithm_config.maxAgeDays || 7,
          diversityPenalty: algorithm.algorithm_config.diversityPenalty || 0.8,
          minScoreThreshold: algorithm.algorithm_config.minScoreThreshold || 0.1,
        });
      }

    } catch (error) {
      console.error('Error loading algorithm:', error);
      toast.error('Failed to load algorithm');
    }
  };

  const addSignal = (signalId: string) => {
    const signal = SIGNAL_TYPES.find(s => s.id === signalId);
    if (signal && !signals.find(s => s.id === signalId)) {
      setSignals([...signals, {
        id: signalId,
        weight: 0.1,
        description: signal.description
      }]);
    }
  };

  const removeSignal = (index: number) => {
    setSignals(signals.filter((_, i) => i !== index));
  };

  const updateWeight = (index: number, weight: number) => {
    const newSignals = [...signals];
    newSignals[index].weight = weight;
    setSignals(newSignals);
  };

  const moveSignal = (index: number, direction: 'up' | 'down') => {
    const newSignals = [...signals];
    if (direction === 'up' && index > 0) {
      [newSignals[index], newSignals[index - 1]] = [newSignals[index - 1], newSignals[index]];
    } else if (direction === 'down' && index < newSignals.length - 1) {
      [newSignals[index], newSignals[index + 1]] = [newSignals[index + 1], newSignals[index]];
    }
    setSignals(newSignals);
  };

  const normalizeWeights = () => {
    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    if (totalWeight === 0) return;

    const normalized = signals.map(signal => ({
      ...signal,
      weight: signal.weight / totalWeight
    }));
    
    setSignals(normalized);
    toast.success('Weights normalized to 100%');
  };

  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const weightError = Math.abs(totalWeight - 1) > 0.01;

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleSubmit = async () => {
    if (!name || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (signals.length === 0) {
      toast.error('Please add at least one signal');
      return;
    }

    if (weightError) {
      toast.error('Signal weights must sum to 100%');
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const weightConfig = signals.reduce((acc, signal) => ({
        ...acc,
        [signal.id]: signal.weight
      }), {});

      const signalDescriptions = signals.reduce((acc, signal) => ({
        ...acc,
        [signal.id]: signal.description
      }), {});

      const algorithmData = {
        name,
        slug: name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        description,
        author_id: userId,
        is_official: false,
        is_public: isPublic,
        license_type: licenseType,
        algorithm_config: advancedSettings,
        signal_descriptions: signalDescriptions,
        weight_config: weightConfig,
        version: '1.0.0',
        updated_at: new Date().toISOString(),
      };

      let algorithmIdResult: string;

      if (mode === 'edit' && algorithmId) {
        // Update existing algorithm
        const { data, error } = await supabase
          .from('feed_algorithms')
          .update(algorithmData)
          .eq('id', algorithmId)
          .select()
          .single();

        if (error) throw error;
        algorithmIdResult = algorithmId;

        // Save revision
        await supabase.from('algorithm_revisions').insert({
          algorithm_id: algorithmId,
          version: '1.0.0',
          config_snapshot: algorithmData,
          changelog: 'Algorithm updated',
          created_by: userId,
        });

        toast.success('Algorithm updated successfully!');
      } else {
        // Create new algorithm
        const { data, error } = await supabase
          .from('feed_algorithms')
          .insert(algorithmData)
          .select()
          .single();

        if (error) throw error;
        algorithmIdResult = data.id;

        // Auto-install for creator
        await supabase
          .from('user_feed_algorithms')
          .insert({
            user_id: userId,
            algorithm_id: data.id,
            is_active: true
          });

        toast.success('Algorithm created successfully!');
      }

      // Update categories
      await supabase
        .from('feed_algorithm_categories_relations')
        .delete()
        .eq('algorithm_id', algorithmIdResult);

      if (selectedCategories.length > 0) {
        const categoryRelations = selectedCategories.map(categoryId => ({
          algorithm_id: algorithmIdResult,
          category_id: categoryId,
        }));

        await supabase
          .from('feed_algorithm_categories_relations')
          .insert(categoryRelations);
      }

      router.push(`/algorithms/${algorithmIdResult}`);
      router.refresh();
    } catch (error: any) {
      console.error('Error saving algorithm:', error);
      toast.error(error.message || `Failed to ${mode} algorithm`);
    } finally {
      setLoading(false);
    }
  };

  const getSignalIcon = (signalId: string) => {
    const signal = SIGNAL_TYPES.find(s => s.id === signalId);
    return signal?.icon || Zap;
  };

  const getSignalCategory = (signalId: string) => {
    const signal = SIGNAL_TYPES.find(s => s.id === signalId);
    return signal?.category || 'other';
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {mode === 'edit' ? 'Edit Algorithm' : 'Create New Algorithm'}
        </h1>
        <p className="text-muted-foreground">
          {mode === 'edit' 
            ? 'Update your algorithm settings and signals'
            : 'Design a custom algorithm to control what appears in your feed'
          }
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="basic" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="signals" className="gap-2">
            <Zap className="h-4 w-4" />
            Signal Config
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Brain className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Give your algorithm a name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Algorithm Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., News Focused, Positive Only, Local Community"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="license">License Type</Label>
                  <Select value={licenseType} onValueChange={setLicenseType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map((license) => (
                        <SelectItem key={license.id} value={license.id}>
                          <div className="flex items-center gap-2">
                            <license.icon className="h-4 w-4" />
                            {license.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what your algorithm does and who it's for..."
                  rows={4}
                />
              </div>
              
              <div className="space-y-4">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <Badge
                        key={category.id}
                        variant={isSelected ? "default" : "outline"}
                        className="gap-2 cursor-pointer px-3 py-2"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <Icon className="h-4 w-4" />
                        {category.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Make Public
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isPublic 
                      ? 'Other users can discover and install your algorithm'
                      : 'Only you can use this algorithm'
                    }
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signal Configuration Tab */}
        <TabsContent value="signals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Signal Configuration</CardTitle>
                  <CardDescription>
                    Choose and weight the signals that determine post ranking
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={normalizeWeights}
                  disabled={weightError || signals.length === 0}
                  className="gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  Normalize Weights
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Add Signal Section */}
              <div className="space-y-4">
                <Label>Available Signals</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SIGNAL_TYPES
                    .filter(s => !signals.find(existing => existing.id === s.id))
                    .map((signal) => {
                      const Icon = signal.icon;
                      return (
                        <Button
                          key={signal.id}
                          variant="outline"
                          className="h-auto p-4 justify-start gap-3"
                          onClick={() => addSignal(signal.id)}
                        >
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{signal.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {signal.description}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                </div>
              </div>

              {/* Signal Weights */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg">Signal Weights</Label>
                  <div className={`text-sm font-medium ${weightError ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Total: {(totalWeight * 100).toFixed(1)}% {weightError && '(Must equal 100%)'}
                  </div>
                </div>
                
                {signals.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No signals added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add signals from the list above to configure your algorithm
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {signals.map((signal, index) => {
                      const signalType = SIGNAL_TYPES.find(s => s.id === signal.id);
                      const Icon = getSignalIcon(signal.id);
                      const category = getSignalCategory(signal.id);
                      
                      return (
                        <div key={index} className="space-y-4 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">{signalType?.name || signal.id}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {category}
                                  </Badge>
                                  <p className="text-sm text-muted-foreground">
                                    {signal.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveSignal(index, 'up')}
                                disabled={index === 0}
                                className="h-8 w-8"
                              >
                                <MoveUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveSignal(index, 'down')}
                                disabled={index === signals.length - 1}
                                className="h-8 w-8"
                              >
                                <MoveDown className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSignal(index)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Weight</span>
                              <span className="font-medium">
                                {(signal.weight * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Slider
                              value={[signal.weight * 100]}
                              min={0}
                              max={100}
                              step={1}
                              onValueChange={([value]) => updateWeight(index, value / 100)}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Low priority</span>
                              <span>High priority</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Algorithm Preview */}
              <div className="p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Algorithm Preview
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium truncate">{name || 'Untitled Algorithm'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Signals</div>
                      <div className="font-medium">{signals.length} active</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Weight Distribution</div>
                    <div className="space-y-1">
                      {signals.map((signal, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="capitalize truncate">
                            {signal.id.replace(/_/g, ' ')}
                          </span>
                          <span className="font-medium">
                            {(signal.weight * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-tune how your algorithm processes and scores content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Time Decay Rate */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="timeDecayRate">Time Decay Rate</Label>
                    <span className="text-sm text-muted-foreground">
                      {advancedSettings.timeDecayRate.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    How quickly post scores decrease over time
                  </p>
                  <Slider
                    value={[advancedSettings.timeDecayRate]}
                    onValueChange={([value]) => setAdvancedSettings({...advancedSettings, timeDecayRate: value})}
                    min={0.8}
                    max={1.0}
                    step={0.01}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Slow decay</span>
                    <span>Fast decay</span>
                  </div>
                </div>
                
                {/* Freshness Boost */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="freshnessBoost">Freshness Boost</Label>
                    <span className="text-sm text-muted-foreground">
                      {advancedSettings.freshnessBoost.toFixed(1)}x
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Boost multiplier for very recent posts
                  </p>
                  <Slider
                    value={[advancedSettings.freshnessBoost]}
                    onValueChange={([value]) => setAdvancedSettings({...advancedSettings, freshnessBoost: value})}
                    min={1.0}
                    max={3.0}
                    step={0.1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>No boost</span>
                    <span>3x boost</span>
                  </div>
                </div>
                
                {/* Friend Multiplier */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="friendMultiplier">Friend Multiplier</Label>
                    <span className="text-sm text-muted-foreground">
                      {advancedSettings.friendMultiplier.toFixed(1)}x
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Boost for posts from friends
                  </p>
                  <Slider
                    value={[advancedSettings.friendMultiplier]}
                    onValueChange={([value]) => setAdvancedSettings({...advancedSettings, friendMultiplier: value})}
                    min={1.0}
                    max={5.0}
                    step={0.1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>No boost</span>
                    <span>5x boost</span>
                  </div>
                </div>
                
                {/* Max Age */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="maxAgeDays">Max Post Age</Label>
                    <span className="text-sm text-muted-foreground">
                      {advancedSettings.maxAgeDays} days
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Don't show posts older than this
                  </p>
                  <Slider
                    value={[advancedSettings.maxAgeDays]}
                    onValueChange={([value]) => setAdvancedSettings({...advancedSettings, maxAgeDays: value})}
                    min={1}
                    max={30}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 day</span>
                    <span>30 days</span>
                  </div>
                </div>
              </div>
              
              {/* Diversity Penalty */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="diversityPenalty">Content Diversity</Label>
                  <span className="text-sm text-muted-foreground">
                    {advancedSettings.diversityPenalty.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Penalty for similar consecutive posts (lower = more diverse)
                </p>
                <Slider
                  value={[advancedSettings.diversityPenalty]}
                  onValueChange={([value]) => setAdvancedSettings({...advancedSettings, diversityPenalty: value})}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Very diverse</span>
                  <span>No diversity</span>
                </div>
              </div>
              
              {/* Minimum Score Threshold */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="minScoreThreshold">Minimum Score</Label>
                  <span className="text-sm text-muted-foreground">
                    {advancedSettings.minScoreThreshold.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum score required to show post (0-1)
                </p>
                <Slider
                  value={[advancedSettings.minScoreThreshold]}
                  onValueChange={([value]) => setAdvancedSettings({...advancedSettings, minScoreThreshold: value})}
                  min={0}
                  max={0.5}
                  step={0.01}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Show all</span>
                  <span>Only best</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (activeTab === 'signals') setActiveTab('basic');
            else if (activeTab === 'advanced') setActiveTab('signals');
          }}
          disabled={activeTab === 'basic'}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/algorithms')}
            disabled={loading}
          >
            Cancel
          </Button>
          
          {activeTab === 'advanced' ? (
            <Button
              onClick={handleSubmit}
              disabled={loading || weightError || !name || !description || signals.length === 0}
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === 'edit' ? 'Update Algorithm' : 'Create Algorithm'}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (activeTab === 'basic') setActiveTab('signals');
                else if (activeTab === 'signals') setActiveTab('advanced');
              }}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}