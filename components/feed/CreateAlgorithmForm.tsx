// components/feed/CreateAlgorithmForm.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const SIGNAL_TYPES = [
  { id: 'time_recency', name: 'Time Recency', icon: Clock, description: 'How recently the post was created' },
  { id: 'follow_level', name: 'Follow Level', icon: Users, description: 'Connection level with author' },
  { id: 'engagement_history', name: 'Engagement History', icon: Users, description: 'Past interactions with author' },
  { id: 'content_quality', name: 'Content Quality', icon: Brain, description: 'Depth and substance of content' },
  { id: 'clickbait_score', name: 'Clickbait Score', icon: Brain, description: 'Likelihood of being sensationalist' },
  { id: 'sentiment_score', name: 'Sentiment', icon: Heart, description: 'Positivity/negativity of content' },
  { id: 'geographic_distance', name: 'Geographic Distance', icon: MapPin, description: 'Physical distance from you' },
  { id: 'topic_match', name: 'Topic Match', icon: Hash, description: 'Alignment with your interests' },
];

export function CreateAlgorithmForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [signals, setSignals] = useState<
    Array<{
      id: string;
      weight: number;
      description: string;
    }>
  >([
    { id: 'time_recency', weight: 0.3, description: 'How recently the post was created' },
    { id: 'follow_level', weight: 0.4, description: 'Connection level with author' },
    { id: 'content_quality', weight: 0.3, description: 'Depth and substance of content' },
  ]);

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

  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const weightError = Math.abs(totalWeight - 1) > 0.01;

  const handleSubmit = async () => {
    if (!name || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (weightError) {
      toast.error('Signal weights must sum to 100%');
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

      const { data, error } = await supabase
        .from('feed_algorithms')
        .insert({
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description,
          author_id: userId,
          is_official: false,
          is_public: isPublic,
          algorithm_config: {
            type: 'custom',
            signals: signals.map(s => s.id)
          },
          signal_descriptions: signalDescriptions,
          weight_config: weightConfig,
          version: '1.0.0'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Algorithm created successfully!');
      
      // Auto-install for creator
      await supabase
        .from('user_feed_algorithms')
        .insert({
          user_id: userId,
          algorithm_id: data.id,
          is_active: true
        });

      router.push('/algorithms');
      router.refresh();
    } catch (error) {
      console.error('Error creating algorithm:', error);
      toast.error('Failed to create algorithm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your algorithm does and who it's for..."
              rows={4}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Make algorithm available to other users
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signal Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose and weight the signals that determine post ranking
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Signal */}
          <div>
            <Label className="mb-2 block">Add Signal</Label>
            <div className="flex gap-2">
              <Select onValueChange={addSignal}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a signal to add" />
                </SelectTrigger>
                <SelectContent>
                  {SIGNAL_TYPES
                    .filter(s => !signals.find(existing => existing.id === s.id))
                    .map((signal) => {
                      const Icon = signal.icon;
                      return (
                        <SelectItem key={signal.id} value={signal.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {signal.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => addSignal(SIGNAL_TYPES[0].id)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Signal Weights */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Signal Weights</Label>
              <div className={`text-sm ${weightError ? 'text-destructive' : 'text-muted-foreground'}`}>
                Total: {(totalWeight * 100).toFixed(1)}% {weightError && '(Must equal 100%)'}
              </div>
            </div>
            
            {signals.map((signal, index) => {
              const signalType = SIGNAL_TYPES.find(s => s.id === signal.id);
              const Icon = signalType?.icon || Zap;
              
              return (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{signalType?.name || signal.id}</h4>
                        <p className="text-sm text-muted-foreground">
                          {signal.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSignal(index, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSignal(index, 'down')}
                        disabled={index === signals.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSignal(index)}
                      >
                        <Trash2 className="h-4 w-4" />
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
                  </div>
                </div>
              );
            })}
          </div>

          {/* Preview */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Algorithm Preview</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Your algorithm will rank posts based on:
            </p>
            <div className="space-y-1">
              {signals.map((signal, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="capitalize">
                    {signal.id.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium">
                    {(signal.weight * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || weightError || !name || !description}
        >
          {loading ? 'Creating...' : 'Create Algorithm'}
        </Button>
      </div>
    </div>
  );
}