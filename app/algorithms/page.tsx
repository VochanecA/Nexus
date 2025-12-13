// app/algorithms/page.tsx
import { AlgorithmSelector } from '@/components/feed/AlgorithmSelector';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, Shield, Users, Brain, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button'; // DODAJ OVAJ IMPORT

export default async function AlgorithmsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/algorithms');
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Feed Algorithms</h1>
        <p className="text-muted-foreground">
          Take control of what you see. Choose or create algorithms that determine your feed's content.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AlgorithmSelector userId={user.id} />
        </div>
        
        <div className="space-y-6">
          {/* Algorithm Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Why customize?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Brain className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium">Better relevance</h4>
                  <p className="text-sm text-muted-foreground">
                    See more of what matters to you
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Less noise</h4>
                  <p className="text-sm text-muted-foreground">
                    Filter out unwanted content
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Heart className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium">Digital wellbeing</h4>
                  <p className="text-sm text-muted-foreground">
                    Algorithms designed for mental health
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Algorithm Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Most popular:</span>
                  <span className="font-medium">Friends First</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Highest rated:</span>
                  <span className="font-medium">Quality Filter ⭐ 4.8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your usage:</span>
                  <span className="font-medium">3 algorithms</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Create Your Own */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Create Your Own</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Coming soon: Build custom algorithms with our visual editor
                </p>
                <Button variant="outline" className="w-full" disabled>
                  Join Waitlist
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}