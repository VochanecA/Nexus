// components/profile/ad-preferences-section.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Bell, 
  TrendingUp,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface AdPreferences {
  show_ads: boolean;
  max_ads: number;
  ads_interval: number;
  hide_ads_completely: boolean;
}

export function AdPreferencesSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<AdPreferences>({
    show_ads: true,
    max_ads: 3,
    ads_interval: 5,
    hide_ads_completely: false
  });
  const [originalPreferences, setOriginalPreferences] = useState<AdPreferences | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    if (!originalPreferences) {
      setHasUnsavedChanges(false);
      return;
    }

    const changed = 
      originalPreferences.show_ads !== preferences.show_ads ||
      originalPreferences.max_ads !== preferences.max_ads ||
      originalPreferences.ads_interval !== preferences.ads_interval ||
      originalPreferences.hide_ads_completely !== preferences.hide_ads_completely;

    setHasUnsavedChanges(changed);
  }, [preferences, originalPreferences]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/ad-preferences');
      
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const prefs: AdPreferences = await response.json();
      setPreferences(prefs);
      setOriginalPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load ad preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/ad-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setOriginalPreferences(preferences);
      setHasUnsavedChanges(false);
      toast.success('Ad preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save ad preferences');
    } finally {
      setSaving(false);
    }
  };

  const resetPreferences = async () => {
    try {
      const response = await fetch('/api/user/ad-preferences', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to reset preferences');
      }

      const defaultPrefs: AdPreferences = {
        show_ads: true,
        max_ads: 3,
        ads_interval: 5,
        hide_ads_completely: false
      };

      setPreferences(defaultPrefs);
      setOriginalPreferences(defaultPrefs);
      setHasUnsavedChanges(false);
      toast.success('Ad preferences reset to default');
    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast.error('Failed to reset preferences');
    }
  };

  const toggleAds = (checked: boolean) => {
    if (!checked) {
      // Isključi sve reklame
      setPreferences({
        ...preferences,
        show_ads: false,
        hide_ads_completely: true,
        max_ads: 0
      });
    } else {
      // Uključi reklame sa default vrednostima
      setPreferences({
        ...preferences,
        show_ads: true,
        hide_ads_completely: false,
        max_ads: 3
      });
    }
  };

  const updateMaxAds = (value: number[]) => {
    const newMaxAds = value[0];
    setPreferences({
      ...preferences,
      max_ads: newMaxAds,
      show_ads: newMaxAds > 0,
      hide_ads_completely: newMaxAds === 0
    });
  };

  const updateAdsInterval = (value: number[]) => {
    setPreferences({
      ...preferences,
      ads_interval: value[0]
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Ad Preferences
          </CardTitle>
          <CardDescription>Loading your ad preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const adsEnabled = !preferences.hide_ads_completely && preferences.max_ads > 0;
  const estimatedAdsPerFeed = preferences.max_ads;
  const postsPerAd = preferences.ads_interval;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Ad Preferences
        </CardTitle>
        <CardDescription>
          Control how and when you see advertisements in your feed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Alert */}
        <Alert className={cn(
          adsEnabled 
            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20" 
            : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
        )}>
          {adsEnabled ? (
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-green-600 dark:text-green-400" />
          )}
          <AlertTitle className={adsEnabled ? "text-blue-900 dark:text-blue-100" : "text-green-900 dark:text-green-100"}>
            {adsEnabled ? 'Ads Enabled' : 'Ads Disabled'}
          </AlertTitle>
          <AlertDescription className={adsEnabled ? "text-blue-700 dark:text-blue-300" : "text-green-700 dark:text-green-300"}>
            {adsEnabled 
              ? `You will see up to ${estimatedAdsPerFeed} ad${estimatedAdsPerFeed !== 1 ? 's' : ''} every ${postsPerAd} posts in your feed.`
              : 'You have completely disabled all advertisements. Your feed will be ad-free.'
            }
          </AlertDescription>
        </Alert>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">Unsaved Changes</AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              You have unsaved changes. Click "Save Preferences" to apply them to your feed.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div className="space-y-0.5">
            <Label htmlFor="ads-toggle" className="text-base font-semibold cursor-pointer">
              Show Advertisements
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable or disable all ads in your feed
            </p>
          </div>
          <Switch
            id="ads-toggle"
            checked={adsEnabled}
            onCheckedChange={toggleAds}
            className="scale-125"
          />
        </div>

        {/* Advanced Settings */}
        {adsEnabled && (
          <div className="space-y-6 pt-4">
            <div className="border-t pt-6">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Advanced Settings
              </h4>

              {/* Max Ads Slider */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max-ads" className="text-sm font-medium">
                      Maximum Ads per Feed
                    </Label>
                    <span className="text-sm font-bold text-primary">
                      {preferences.max_ads} {preferences.max_ads === 1 ? 'ad' : 'ads'}
                    </span>
                  </div>
                  <Slider
                    id="max-ads"
                    min={0}
                    max={10}
                    step={1}
                    value={[preferences.max_ads]}
                    onValueChange={updateMaxAds}
                    className="py-4"
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to 0 to disable all ads
                  </p>
                </div>

                {/* Ads Interval Slider */}
                {preferences.max_ads > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ads-interval" className="text-sm font-medium">
                        Posts Between Ads
                      </Label>
                      <span className="text-sm font-bold text-primary">
                        Every {preferences.ads_interval} posts
                      </span>
                    </div>
                    <Slider
                      id="ads-interval"
                      min={2}
                      max={20}
                      step={1}
                      value={[preferences.ads_interval]}
                      onValueChange={updateAdsInterval}
                      className="py-4"
                    />
                    <p className="text-xs text-muted-foreground">
                      How often ads appear in your feed
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {preferences.max_ads}
                </div>
                <div className="text-xs text-muted-foreground">Max Ads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {preferences.ads_interval}
                </div>
                <div className="text-xs text-muted-foreground">Post Interval</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {preferences.max_ads > 0 
                    ? `~${((preferences.max_ads / (preferences.max_ads * preferences.ads_interval + preferences.max_ads)) * 100).toFixed(0)}%`
                    : '0%'
                  }
                </div>
                <div className="text-xs text-muted-foreground">Ad Density</div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How Ads Work</AlertTitle>
          <AlertDescription>
            Ads help support the platform and content creators. You have full control over your ad experience. 
            Changes take effect immediately after saving and will persist across all your devices.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={savePreferences}
            disabled={saving || !hasUnsavedChanges}
            className="flex-1 gap-2"
            size="lg"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : hasUnsavedChanges ? (
              <>
                <Save className="h-4 w-4" />
                Save Preferences
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </>
            )}
          </Button>

          <Button
            onClick={resetPreferences}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}