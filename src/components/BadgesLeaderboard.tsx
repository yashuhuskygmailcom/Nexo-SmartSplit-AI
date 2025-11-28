import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trophy, Star, Target, Zap, ArrowLeft, Crown, Medal, Award } from 'lucide-react';

interface BadgesLeaderboardProps {
  onBack: () => void;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number;
  total?: number;
}

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  points: number;
  rank: number;
  badges: number;
}

const mockBadges: BadgeItem[] = [
  {
    id: '1',
    name: 'Split Master',
    description: 'Split 10 expenses successfully',
    icon: '🏆',
    earned: true,
    progress: 10,
    total: 10
  },
  {
    id: '2',
    name: 'Social Butterfly',
    description: 'Add 5 friends to Nexo',
    icon: '🦋',
    earned: true,
    progress: 5,
    total: 5
  },
  {
    id: '3',
    name: 'Budget Boss',
    description: 'Stay under budget for a month',
    icon: '💎',
    earned: false,
    progress: 23,
    total: 30
  },
  {
    id: '4',
    name: 'Scanner Pro',
    description: 'Scan 20 receipts using OCR',
    icon: '📱',
    earned: false,
    progress: 12,
    total: 20
  },
  {
    id: '5',
    name: 'Group Leader',
    description: 'Create 3 expense groups',
    icon: '👑',
    earned: true,
    progress: 3,
    total: 3
  },
  {
    id: '6',
    name: 'Early Bird',
    description: 'Pay bills before due date 5 times',
    icon: '🌅',
    earned: false,
    progress: 2,
    total: 5
  }
];

const mockLeaderboard: LeaderboardUser[] = [
  { id: '1', name: 'You', avatar: '👤', points: 2450, rank: 1, badges: 8 },
  { id: '2', name: 'Alice Johnson', avatar: '👩', points: 2380, rank: 2, badges: 7 },
  { id: '3', name: 'Bob Smith', avatar: '👨', points: 2100, rank: 3, badges: 6 },
  { id: '4', name: 'Carol Davis', avatar: '👩‍🦱', points: 1950, rank: 4, badges: 5 },
  { id: '5', name: 'David Wilson', avatar: '👨‍🦲', points: 1800, rank: 5, badges: 4 }
];

export function BadgesLeaderboard({ onBack }: BadgesLeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2: return <Medal className="h-5 w-5 text-slate-300" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-slate-400 font-medium">#{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            className="bg-slate-800/60 hover:bg-slate-700/60 border-slate-600/50 text-slate-200"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl bg-gradient-to-r from-slate-200 to-blue-200 bg-clip-text text-transparent font-light tracking-wide">
            Badges & Leaderboard
          </h1>
        </div>

        {/* Your Stats */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
                <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">2,450</p>
                <p className="text-slate-400 text-sm">Total Points</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-slate-500/10 rounded-xl border border-blue-500/20">
                <Star className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">8</p>
                <p className="text-slate-400 text-sm">Badges Earned</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                <Target className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">#1</p>
                <p className="text-slate-400 text-sm">Rank</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                <Zap className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">15</p>
                <p className="text-slate-400 text-sm">Streak Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Collection */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-blue-300" />
              </div>
              Your Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    badge.earned
                      ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
                      : 'bg-slate-700/30 border-slate-600/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-3xl ${badge.earned ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-slate-200 font-medium">{badge.name}</h3>
                        {badge.earned && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            Earned
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mb-2">{badge.description}</p>
                      {badge.progress !== undefined && badge.total !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Progress</span>
                            <span className="text-slate-300">{badge.progress}/{badge.total}</span>
                          </div>
                          <div className="w-full bg-slate-600/30 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                badge.earned
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gradient-to-r from-blue-500 to-slate-500'
                              }`}
                              style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="h-4 w-4 text-yellow-300" />
              </div>
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockLeaderboard.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                    user.name === 'You'
                      ? 'bg-gradient-to-r from-blue-500/20 to-slate-500/20 border border-blue-500/30'
                      : 'bg-slate-700/30 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(user.rank)}
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-xl flex items-center justify-center text-lg">
                      {user.avatar}
                    </div>
                    <div>
                      <p className={`font-medium ${user.name === 'You' ? 'text-blue-200' : 'text-slate-200'}`}>
                        {user.name}
                      </p>
                      <p className="text-slate-400 text-sm">{user.badges} badges earned</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-200 font-medium">{user.points.toLocaleString()}</p>
                    <p className="text-slate-400 text-sm">points</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}