// components/admin/view-stats.tsx
"use client";
// Dodajte ovo u imports ako već niste
import { Button } from "@/components/ui/button";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Users, TrendingUp, Calendar, BarChart } from "lucide-react";

interface ViewStatsProps {
  postId: string;
}

export function ViewStats({ postId }: ViewStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(7); // 7 dana po defaultu

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      
      // Koristite RPC funkciju za dnevne preglede
      const { data: dailyViews, error } = await supabase
        .rpc('get_daily_views', {
          post_id_param: postId,
          days_param: timeRange
        });

      if (error) {
        console.error('Error fetching daily views:', error);
        // Fallback na stari način
        const { data } = await supabase
          .from('post_views')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (data) {
          processFallbackData(data);
        }
      } else if (dailyViews) {
        // Procesirajte podatke iz RPC funkcije
        processRPCData(dailyViews);
      }
      
      setLoading(false);
    };

    const processRPCData = (dailyViews: any[]) => {
      // Dohvatite ukupan broj pregleda iz posts tabele
      const supabase = createClient();
      supabase
        .from('posts')
        .select('views_count')
        .eq('id', postId)
        .single()
        .then(({ data: postData }) => {
          const totalViews = postData?.views_count || 0;
          
          // Dohvatite jedinstvene korisnike i sesije
          supabase
            .from('post_views')
            .select('user_id, session_id')
            .eq('post_id', postId)
            .then(({ data: allViews }) => {
              const uniqueUsers = new Set(allViews?.filter(v => v.user_id).map(v => v.user_id)).size;
              const uniqueSessions = new Set(allViews?.map(v => v.session_id)).size;
              
              setStats({
                total: totalViews,
                daily: dailyViews.map(day => ({
                  date: new Date(day.date).toLocaleDateString(),
                  views: Number(day.views_count)
                })).reverse(), // Reverse za hronološki prikaz
                uniqueUsers,
                uniqueSessions,
                engagementRate: totalViews > 0 ? ((uniqueUsers / totalViews) * 100) : 0
              });
            });
        });
    };

    const processFallbackData = (data: any[]) => {
      const dailyStats = data.reduce((acc: any[], view) => {
        const date = new Date(view.created_at).toLocaleDateString();
        const existing = acc.find(item => item.date === date);
        
        if (existing) {
          existing.views += 1;
        } else {
          acc.push({ date, views: 1 });
        }
        
        return acc;
      }, []);

      setStats({
        total: data.length,
        daily: dailyStats,
        uniqueUsers: new Set(data.filter(v => v.user_id).map(v => v.user_id)).size,
        uniqueSessions: new Set(data.map(v => v.session_id)).size,
        engagementRate: data.length > 0 ? ((new Set(data.filter(v => v.user_id).map(v => v.user_id)).size / data.length) * 100) : 0
      });
    };

    fetchStats();
  }, [postId, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 mb-4">
        <Button 
          variant={timeRange === 7 ? "default" : "outline"} 
          onClick={() => setTimeRange(7)}
          size="sm"
        >
          7 dana
        </Button>
        <Button 
          variant={timeRange === 30 ? "default" : "outline"} 
          onClick={() => setTimeRange(30)}
          size="sm"
        >
          30 dana
        </Button>
        <Button 
          variant={timeRange === 90 ? "default" : "outline"} 
          onClick={() => setTimeRange(90)}
          size="sm"
        >
          90 dana
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Total Views</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{stats?.total || 0}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Unique Users</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{stats?.uniqueUsers || 0}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold">Unique Sessions</h3>
          </div>
          <p className="text-2xl font-bold mt-2">{stats?.uniqueSessions || 0}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Engagement Rate</h3>
          </div>
          <p className="text-2xl font-bold mt-2">
            {stats?.engagementRate ? stats.engagementRate.toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Views Trend ({timeRange} days)
          </h3>
          <span className="text-sm text-gray-500">
            Total: {stats?.daily?.reduce((sum: number, day: any) => sum + day.views, 0) || 0} views
          </span>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.daily || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value} views`, 'Views']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}