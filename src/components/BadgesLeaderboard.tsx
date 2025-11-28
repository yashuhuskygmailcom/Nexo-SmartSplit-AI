import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Trophy, Star, Target, Zap, ArrowLeft, Crown, Medal, Award, Edit, Trash2, Plus, Check } from 'lucide-react';
import { getBadges, getLeaderboard, createBadge, updateBadge, deleteBadge } from '../api';

interface BadgesLeaderboardProps {
  onBack: () => void;
}

interface BadgeItem {
  id: number;
  name: string;
  description: string;
  icon: string;
  points_required: number;
  earned_by_count: number;
  user_earned: number;
}

interface LeaderboardUser {
  id: number;
  name: string;
  avatar: string;
  points: number;
  rank: number;
  badges: number;
}

const PRESET_BADGES = [
  { name: 'Split Master', description: 'Successfully split 10 expenses', icon: '🏆' },
  { name: 'Social Butterfly', description: 'Add 5 friends to your network', icon: '🦋' },
  { name: 'Budget Boss', description: 'Stay under budget for a full month', icon: '💎' },
  { name: 'Scanner Pro', description: 'Scan 20 receipts using OCR', icon: '📱' },
  { name: 'Group Leader', description: 'Create 3 expense groups', icon: '👑' },
  { name: 'Early Bird', description: 'Pay bills before due date 5 times', icon: '🌅' },
  { name: 'Debt Free', description: 'Settle all debts with friends', icon: '✨' },
  { name: 'Spender', description: 'Spend over $1000 in a month', icon: '💰' },
  { name: 'Accountant', description: 'Track expenses for 30 consecutive days', icon: '📊' },
  { name: 'Generous Soul', description: 'Pay for group expenses 10 times', icon: '🤝' },
  { name: 'Weekend Warrior', description: 'Split expenses on weekend getaways', icon: '🎉' },
  { name: 'Money Manager', description: 'Create and manage 5 different budgets', icon: '💼' },
];

export function BadgesLeaderboard({ onBack }: BadgesLeaderboardProps) {
  const [badgesList, setBadgesList] = useState<BadgeItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBadge, setEditingBadge] = useState<BadgeItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<(typeof PRESET_BADGES)[0] | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '⭐',
    points_required: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [badgesRes, leaderboardRes] = await Promise.all([
        getBadges(),
        getLeaderboard(),
      ]);
      setBadgesList(badgesRes.data || []);
      setLeaderboard(leaderboardRes.data || []);
    } catch (error) {
      console.error('Error fetching badges/leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBadge = async () => {
    let dataToSubmit = formData;

    if (createMode === 'preset' && selectedPreset) {
      dataToSubmit = {
        name: selectedPreset.name,
        description: selectedPreset.description,
        icon: selectedPreset.icon,
        points_required: 0,
      };
    } else if (createMode === 'custom') {
      if (!formData.name.trim()) {
        alert('Badge name is required');
        return;
      }
      dataToSubmit = formData;
    } else {
      alert('Please select or create a badge');
      return;
    }

    try {
      await createBadge(dataToSubmit);
      setIsCreateDialogOpen(false);
      setCreateMode('preset');
      setSelectedPreset(null);
      setFormData({ name: '', description: '', icon: '⭐', points_required: 0 });
      fetchData();
    } catch (error) {
      console.error('Error creating badge:', error);
    }
  };

  const handleEditBadge = (badge: BadgeItem) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      points_required: badge.points_required,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBadge = async () => {
    if (!editingBadge) return;
    if (!formData.name.trim()) {
      alert('Badge name is required');
      return;
    }
    try {
      await updateBadge(editingBadge.id, formData);
      setIsEditDialogOpen(false);
      setEditingBadge(null);
      setFormData({ name: '', description: '', icon: '⭐', points_required: 0 });
      fetchData();
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (confirm('Are you sure you want to delete this badge?')) {
      try {
        await deleteBadge(badgeId);
        fetchData();
      } catch (error) {
        console.error('Error deleting badge:', error);
      }
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2: return <Medal className="h-5 w-5 text-slate-300" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-slate-400 font-medium">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4 flex items-center justify-center">
        <p className="text-slate-300">Loading badges and leaderboard...</p>
      </div>
    );
  }

  const totalPoints = leaderboard.reduce((sum, user) => sum + user.points, 0);
  const totalBadges = badgesList.length;
  const userStats = leaderboard.length > 0 ? leaderboard[0] : null;

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
                <p className="text-2xl text-slate-200 font-light">{totalPoints.toLocaleString()}</p>
                <p className="text-slate-400 text-sm">Total Points</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-slate-500/10 rounded-xl border border-blue-500/20">
                <Star className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">{totalBadges}</p>
                <p className="text-slate-400 text-sm">Total Badges</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                <Target className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">#{userStats?.rank || 1}</p>
                <p className="text-slate-400 text-sm">Your Rank</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                <Zap className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">{userStats?.badges || 0}</p>
                <p className="text-slate-400 text-sm">Your Badges</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Collection */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-blue-300" />
              </div>
              Your Badges
            </CardTitle>
            <Button
              onClick={() => {
                setCreateMode('preset');
                setSelectedPreset(null);
                setFormData({ name: '', description: '', icon: '⭐', points_required: 0 });
                setIsCreateDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Badge
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {badgesList.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    badge.user_earned
                      ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
                      : 'bg-slate-700/30 border-slate-600/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-3xl ${badge.user_earned ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-slate-200 font-medium">{badge.name}</h3>
                        {badge.user_earned && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            Earned
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mb-2">{badge.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Earned by {badge.earned_by_count} user{badge.earned_by_count !== 1 ? 's' : ''}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEditBadge(badge)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-300"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteBadge(badge.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
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
              {leaderboard.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                    user.rank === 1
                      ? 'bg-gradient-to-r from-blue-500/20 to-slate-500/20 border border-blue-500/30'
                      : 'bg-slate-700/30 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(user.rank)}
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-xl flex items-center justify-center text-lg font-bold">
                      {user.avatar}
                    </div>
                    <div>
                      <p className={`font-medium ${user.rank === 1 ? 'text-blue-200' : 'text-slate-200'}`}>
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

      {/* Edit Badge Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-600/50">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Edit Badge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm font-medium">Badge Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                placeholder="e.g., Budget Master"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                placeholder="What does this badge reward?"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium">Icon (emoji)</label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                placeholder="e.g., ⭐"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium">Points Required</label>
              <Input
                type="number"
                value={formData.points_required}
                onChange={(e) => setFormData({ ...formData, points_required: Number(e.target.value) })}
                className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              className="bg-slate-700/50 border-slate-600 text-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBadge}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Badge Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-600/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Add New Badge</DialogTitle>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => setCreateMode('preset')}
              className={`flex-1 ${
                createMode === 'preset'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
              variant={createMode === 'preset' ? 'default' : 'outline'}
            >
              Choose Preset
            </Button>
            <Button
              onClick={() => setCreateMode('custom')}
              className={`flex-1 ${
                createMode === 'custom'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
              variant={createMode === 'custom' ? 'default' : 'outline'}
            >
              Create Custom
            </Button>
          </div>

          {/* Preset Selection */}
          {createMode === 'preset' && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {PRESET_BADGES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPreset(selectedPreset?.name === preset.name ? null : preset)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPreset?.name === preset.name
                      ? 'bg-blue-500/20 border-blue-500/60'
                      : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-600/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{preset.icon}</span>
                      <div>
                        <p className="text-slate-200 font-medium">{preset.name}</p>
                        <p className="text-slate-400 text-sm">{preset.description}</p>
                      </div>
                    </div>
                    {selectedPreset?.name === preset.name && (
                      <Check className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom Badge Input */}
          {createMode === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium">Badge Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                  placeholder="e.g., Budget Master"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                  placeholder="What does this badge reward?"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium">Icon (emoji)</label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                  placeholder="e.g., ⭐"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium">Points Required</label>
                <Input
                  type="number"
                  value={formData.points_required}
                  onChange={(e) => setFormData({ ...formData, points_required: Number(e.target.value) })}
                  className="bg-slate-700/50 border-slate-600 text-slate-200 mt-1"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setIsCreateDialogOpen(false)}
              variant="outline"
              className="bg-slate-700/50 border-slate-600 text-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBadge}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createMode === 'preset' && selectedPreset ? 'Add Preset Badge' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}