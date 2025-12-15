// app/advertise/page.tsx - KOMPLETAN ADVERTISER DASHBOARD
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  DollarSign,
  Eye,
  Heart,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  CreditCard,
  Sparkles,
  Target,
  Zap,
  Shield,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

// Types
interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  ad_credits?: number;
}

interface PromotedPost {
  id: string;
  post_id: string;
  advertiser_id: string;
  total_budget: number;
  remaining_budget: number;
  bid_per_view: number;
  bid_per_like: number;
  bid_per_follow: number;
  target_hashtags: string[];
  target_categories: string[];
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'completed';
  total_views: number;
  total_likes: number;
  total_follows: number;
  total_spent: number;
  created_at: string;
  posts?: {
    content: string;
    image_url: string | null;
  };
}

interface CreditPackage {
  id: string;
  name: string;
  amount: number;
  credits: number;
}

interface CampaignFormData {
  selectedPost: string;
  budget: string;
  duration: string;
  bidPerView: string;
  bidPerLike: string;
  bidPerFollow: string;
  targetHashtags: string;
  targetCategory: string;
}

interface UserData {
  id: string;
  email?: string;
}

// Stripe initialization
let stripePromise: Promise<any> | null = null;

const getStripe = () => {
  if (!stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

const redirectToCheckout = async (sessionId: string) => {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }
  
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) {
    throw error;
  }
};

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: '50', name: 'Starter', amount: 50, credits: 50 },
  { id: '100', name: 'Pro', amount: 100, credits: 110 },
  { id: '200', name: 'Business', amount: 200, credits: 230 },
  { id: '500', name: 'Enterprise', amount: 500, credits: 600 },
];

const CATEGORIES = [
  { value: 'tech', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
] as const;

export default function AdvertiserDashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [campaigns, setCampaigns] = useState<PromotedPost[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CampaignFormData>({
    selectedPost: '',
    budget: '50',
    duration: '7',
    bidPerView: '0.01',
    bidPerLike: '0.05',
    bidPerFollow: '0.10',
    targetHashtags: '',
    targetCategory: '',
  });
  
  // Purchase state
  const [selectedPackage, setSelectedPackage] = useState<string>('100');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load user and data
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        window.location.href = '/login';
        return;
      }
      
      setUser(currentUser);
      
      // Load profile with ad_credits
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      setProfile(profileData || null);
      
      // Load campaigns
      const { data: campaignsData } = await supabase
        .from('promoted_posts')
        .select(`
          *,
          posts (content, image_url)
        `)
        .eq('advertiser_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      setCampaigns(campaignsData || []);
      
      // Load user posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setUserPosts(postsData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Calculate quality score
  const calculateQualityScore = useCallback((post: Post | undefined): number => {
    if (!post) return 0;
    
    let score = 0;
    const contentLength = post.content.length;
    
    // Content length
    if (contentLength > 100) score += 30;
    else if (contentLength > 50) score += 20;
    else if (contentLength > 20) score += 10;
    
    // Has image
    if (post.image_url) score += 30;
    
    // Has hashtags
    const hasHashtags = /#\w+/.test(post.content);
    if (hasHashtags) score += 20;
    
    // Not all caps
    const isNotAllCaps = post.content !== post.content.toUpperCase();
    if (isNotAllCaps) score += 20;
    
    return Math.min(score, 100);
  }, []);

  // Handle form changes
  const handleFormChange = (field: keyof CampaignFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  // Create campaign
  const handleCreateCampaign = async () => {
    const { selectedPost, budget, duration, bidPerView, bidPerLike, bidPerFollow, targetHashtags, targetCategory } = formData;
    
    if (!selectedPost || !budget || !duration) {
      setError('Molimo popunite sva obavezna polja');
      return;
    }
    
    const budgetNum = parseFloat(budget);
    const currentCredits = profile?.ad_credits || 0;
    
    if (budgetNum < 10) {
      setError('Minimalni budžet je €10');
      return;
    }
    
    if (budgetNum > currentCredits) {
      setError(`Nemate dovoljno kredita. Dostupno: €${currentCredits.toFixed(2)}`);
      return;
    }
    
    setCreating(true);
    setError('');
    
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(duration));
      
      // Quality score check
      const selectedPostData = userPosts.find(p => p.id === selectedPost);
      const qualityScore = calculateQualityScore(selectedPostData);
      
      if (qualityScore < 50) {
        setError('Post ne ispunjava minimum quality score (50). Dodajte sliku ili bolji sadržaj.');
        setCreating(false);
        return;
      }
      
      const hashtags = targetHashtags
        .split(',')
        .map(h => h.trim().toLowerCase().replace('#', ''))
        .filter(h => h.length > 0);
      
      // Start transaction: deduct credits and create campaign
      const { error: createError } = await supabase
        .from('promoted_posts')
        .insert({
          post_id: selectedPost,
          advertiser_id: user?.id,
          total_budget: budgetNum,
          remaining_budget: budgetNum,
          bid_per_view: parseFloat(bidPerView),
          bid_per_like: parseFloat(bidPerLike),
          bid_per_follow: parseFloat(bidPerFollow),
          target_hashtags: hashtags,
          target_categories: targetCategory ? [targetCategory] : [],
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
        });
      
      if (createError) throw createError;
      
      // Deduct credits from profile
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ ad_credits: currentCredits - budgetNum })
        .eq('id', user?.id);
      
      if (creditError) throw creditError;
      
      // Reload data
      await loadData();
      
      // Reset form
      setFormData({
        selectedPost: '',
        budget: '50',
        duration: '7',
        bidPerView: '0.01',
        bidPerLike: '0.05',
        bidPerFollow: '0.10',
        targetHashtags: '',
        targetCategory: '',
      });
      
      setCreateDialogOpen(false);
      setSuccess('Kampanja uspešno kreirana!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      setError(error.message || 'Greška pri kreiranju kampanje. Pokušajte ponovo.');
    } finally {
      setCreating(false);
    }
  };

  // Purchase credits - POPRAVLJENO
  const handlePurchaseCredits = async () => {
    if (!user) {
      setError('Morate biti prijavljeni');
      return;
    }
    
    const selectedPkg = CREDIT_PACKAGES.find(p => p.id === selectedPackage);
    if (!selectedPkg) {
      setError('Odaberite validan paket');
      return;
    }
    
    setPurchasing(true);
    setError('');
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPkg.amount,
          packageName: `${selectedPkg.name} Package`,
          credits: selectedPkg.credits,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session');
      }
      
      // Koristite popravljenu funkciju
      await redirectToCheckout(result.sessionId);
      
    } catch (error: any) {
      console.error('Error purchasing credits:', error);
      setError(error.message || 'Greška pri kupovini kredita. Pokušajte ponovo.');
      
      // Fallback: ako Stripe faila, dodajte kredite za testiranje
      if (process.env.NODE_ENV === 'development') {
        const fallbackCredits = selectedPkg.credits;
        await supabase
          .from('profiles')
          .update({ ad_credits: (profile?.ad_credits || 0) + fallbackCredits })
          .eq('id', user.id);
        
        await loadData();
        setSuccess(`Added ${fallbackCredits} credits (development fallback)`);
        setTimeout(() => setSuccess(''), 5000);
      }
      
      setPurchasing(false);
    }
  };

  // Toggle campaign status
  const toggleCampaignStatus = async (campaignId: string, currentStatus: PromotedPost['status']) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    await supabase
      .from('promoted_posts')
      .update({ status: newStatus })
      .eq('id', campaignId);
    
    // Update local state
    setCampaigns(prev => prev.map(campaign =>
      campaign.id === campaignId
        ? { ...campaign, status: newStatus }
        : campaign
    ));
  };

  // Handle refresh
  const handleRefresh = () => {
    void loadData();
  };

  // Calculate totals
  const totals = {
    spent: campaigns.reduce((sum, c) => sum + c.total_spent, 0),
    views: campaigns.reduce((sum, c) => sum + c.total_views, 0),
    likes: campaigns.reduce((sum, c) => sum + c.total_likes, 0),
    follows: campaigns.reduce((sum, c) => sum + c.total_follows, 0),
  };
  
  const avgCTR = totals.views > 0
    ? ((totals.likes + totals.follows) / totals.views * 100).toFixed(2)
    : '0.00';

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <Target className="h-6 w-6 text-white" />
                </div>
                Advertiser Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Promoviši svoje postove i dosegni relevantnu publiku
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                      <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ad Credits</p>
                      <p className="text-xl font-bold">€{(profile?.ad_credits || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Add Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Choose Credit Package</DialogTitle>
                    <DialogDescription>
                      Select a package to add credits to your account
                    </DialogDescription>
                  </DialogHeader>
                  
                  <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage}>
                    {CREDIT_PACKAGES.map(pkg => (
                      <div key={pkg.id} className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-accent cursor-pointer">
                        <RadioGroupItem value={pkg.id} id={`pkg-${pkg.id}`} />
                        <Label htmlFor={`pkg-${pkg.id}`} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold">{pkg.name}</div>
                              <div className="text-sm text-muted-foreground">
                                €{pkg.amount} → {pkg.credits} credits
                              </div>
                            </div>
                            {pkg.credits > pkg.amount && (
                              <Badge variant="secondary" className="ml-2">
                                +{pkg.credits - pkg.amount} bonus
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setPurchaseDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePurchaseCredits}
                      disabled={purchasing}
                    >
                      {purchasing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Purchase'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 gap-2">
                    <Plus className="h-4 w-4" />
                    New Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>
                      Promoviši svoj post i dosegni ciljanu publiku
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    {/* Select Post */}
                    <div className="space-y-2">
                      <Label htmlFor="select-post">Izaberi Post *</Label>
                      <Select
                        value={formData.selectedPost}
                        onValueChange={(value) => handleFormChange('selectedPost', value)}
                      >
                        <SelectTrigger id="select-post">
                          <SelectValue placeholder="Izaberi post za promociju" />
                        </SelectTrigger>
                        <SelectContent>
                          {userPosts.map(post => {
                            const qualityScore = calculateQualityScore(post);
                            return (
                              <SelectItem key={post.id} value={post.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span className="truncate max-w-[200px]">
                                    {post.content.substring(0, 50)}...
                                  </span>
                                  <Badge
                                    variant={qualityScore >= 70 ? 'default' : qualityScore >= 50 ? 'secondary' : 'destructive'}
                                    className="ml-2"
                                  >
                                    Q: {qualityScore}
                                  </Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {formData.selectedPost && (
                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            Quality Score: {calculateQualityScore(userPosts.find(p => p.id === formData.selectedPost))} / 100
                            {calculateQualityScore(userPosts.find(p => p.id === formData.selectedPost)) < 50 && (
                              <span className="text-red-500 ml-2">
                                (Minimum 50 required)
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Budget & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="budget">Budžet (€) *</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={formData.budget}
                          onChange={(e) => handleFormChange('budget', e.target.value)}
                          placeholder="50"
                          min="10"
                          step="10"
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum: €10 | Dostupno: €{(profile?.ad_credits || 0).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="duration">Trajanje (dani) *</Label>
                        <Select
                          value={formData.duration}
                          onValueChange={(value) => handleFormChange('duration', value)}
                        >
                          <SelectTrigger id="duration">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 dana</SelectItem>
                            <SelectItem value="7">7 dana</SelectItem>
                            <SelectItem value="14">14 dana</SelectItem>
                            <SelectItem value="30">30 dana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Bids */}
                    <div className="space-y-3">
                      <Label>Cena po Akciji</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="bid-view" className="text-xs">Per View (€)</Label>
                          <Input
                            id="bid-view"
                            type="number"
                            value={formData.bidPerView}
                            onChange={(e) => handleFormChange('bidPerView', e.target.value)}
                            step="0.01"
                            min="0.01"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bid-like" className="text-xs">Per Like (€)</Label>
                          <Input
                            id="bid-like"
                            type="number"
                            value={formData.bidPerLike}
                            onChange={(e) => handleFormChange('bidPerLike', e.target.value)}
                            step="0.01"
                            min="0.01"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bid-follow" className="text-xs">Per Follow (€)</Label>
                          <Input
                            id="bid-follow"
                            type="number"
                            value={formData.bidPerFollow}
                            onChange={(e) => handleFormChange('bidPerFollow', e.target.value)}
                            step="0.01"
                            min="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Targeting */}
                    <div className="space-y-2">
                      <Label htmlFor="hashtags">Target Hashtags</Label>
                      <Input
                        id="hashtags"
                        value={formData.targetHashtags}
                        onChange={(e) => handleFormChange('targetHashtags', e.target.value)}
                        placeholder="tehnologija, ai, startup (odvojeno zarezima)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Target Category</Label>
                      <Select
                        value={formData.targetCategory}
                        onValueChange={(value) => handleFormChange('targetCategory', value)}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Izaberi kategoriju" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Estimated Reach */}
                    {formData.budget && parseFloat(formData.bidPerView) > 0 && (
                      <Alert>
                        <Zap className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Procenjeni doseg:</strong> ~
                          {Math.floor(parseFloat(formData.budget) / parseFloat(formData.bidPerView)).toLocaleString()} views
                        </AlertDescription>
                      </Alert>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCampaign}
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Create Campaign
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Success Alert */}
        {success && !createDialogOpen && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totals.spent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Across {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.views.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Avg CTR: {avgCTR}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.likes}</div>
              <p className="text-xs text-muted-foreground">
                {totals.views > 0 ? ((totals.likes / totals.views) * 100).toFixed(2) : '0'}% like rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Followers</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.follows}</div>
              <p className="text-xs text-muted-foreground">
                From promoted posts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns</CardTitle>
            <CardDescription>
              Manage and track your promoted posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first campaign to start promoting your content
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="border-2">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant={
                              campaign.status === 'active' ? 'default' :
                              campaign.status === 'paused' ? 'secondary' : 'outline'
                            }>
                              {campaign.status.toUpperCase()}
                            </Badge>
                            {campaign.target_hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {campaign.target_hashtags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {campaign.posts?.content}
                          </p>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                          className="self-start md:self-auto"
                        >
                          {campaign.status === 'active' ? 'Pause' : 'Resume'}
                        </Button>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Views</p>
                          <p className="text-lg font-semibold">{campaign.total_views}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Likes</p>
                          <p className="text-lg font-semibold">{campaign.total_likes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Follows</p>
                          <p className="text-lg font-semibold">{campaign.total_follows}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Spent</p>
                          <p className="text-lg font-semibold">€{campaign.total_spent.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Budget Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-medium">
                            €{campaign.remaining_budget.toFixed(2)} / €{campaign.total_budget.toFixed(2)}
                          </span>
                        </div>
                        <Progress 
                          value={campaign.total_budget > 0 ? (campaign.remaining_budget / campaign.total_budget) * 100 : 0} 
                        />
                      </div>

                      {/* Dates */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                        </span>
                        {campaign.total_views > 0 && (
                          <span>
                            CTR: {((campaign.total_likes + campaign.total_follows) / campaign.total_views * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}