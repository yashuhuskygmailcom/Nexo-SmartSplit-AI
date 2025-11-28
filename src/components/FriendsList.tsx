import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, Users, MessageCircle, DollarSign } from 'lucide-react';
import { apiClient } from '../apiClient';
import { toast } from './ui/use-toast';

interface FriendsListProps {
  onBack: () => void;
}

interface Friend {
  id: number;
  username: string;
  email: string;
  balance?: number;
}

interface Group {
  id: number;
  name: string;
  members: string[];
  totalExpenses: number;
}

export function FriendsList({ onBack }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');

  const fetchFriends = useCallback(async () => {
    try {
      console.log('[FriendsList] Fetching friends...');
      const response = await apiClient.get('/friends');
      console.log('[FriendsList] Friends fetched:', response.data);
      setFriends(response.data);
    } catch (error) {
      console.error('[FriendsList] Error fetching friends:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch friends.',
        variant: 'destructive',
      });
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await apiClient.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch groups.',
        variant: 'destructive',
      });
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchGroups();
  }, [fetchFriends, fetchGroups]);

  const addFriend = async () => {
    if (!newFriendEmail) return;
    try {
      const response = await apiClient.get(`/user/${newFriendEmail}`);
      const friendId = response.data.user.id;
      await apiClient.post('/friends', { friendId });
      setNewFriendEmail('');
      fetchFriends();
      toast({
        title: 'Success',
        description: 'Friend added successfully.',
      });
    } catch (error) {
      console.error('Error adding friend:', error);
      toast({
        title: 'Error',
        description: 'Could not add friend. Make sure the email is correct and the user exists.',
        variant: 'destructive',
      });
    }
  };

  const createGroup = async () => {
    if (newGroupName && selectedMembers.length > 0) {
      try {
        await apiClient.post('/groups', { name: newGroupName, members: selectedMembers });
        setNewGroupName('');
        setSelectedMembers([]);
        fetchGroups();
        toast({
          title: 'Success',
          description: 'Group created successfully.',
        });
      } catch (error) {
        console.error('Error creating group:', error);
        toast({
          title: 'Error',
          description: 'Could not create group.',
          variant: 'destructive',
        });
      }
    }
  };

  const toggleMember = (memberId: number) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            className="bg-white/10 hover:bg-white/20 border-blue-400/50 text-white"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
            Friends & Groups
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab('friends')}
            className={`${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            } border-0`}
          >
            <Users className="h-4 w-4 mr-2" />
            Friends
          </Button>
          <Button
            onClick={() => setActiveTab('groups')}
            className={`${
              activeTab === 'groups'
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white'
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            } border-0`}
          >
            <Users className="h-4 w-4 mr-2" />
            Groups
          </Button>
        </div>

        {activeTab === 'friends' && (
          <>
            {/* Add Friend */}
            <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Friend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter friend's email"
                    value={newFriendEmail}
                    onChange={(e) => setNewFriendEmail(e.target.value)}
                    className="bg-white/10 border-blue-400/50 text-white placeholder:text-blue-200"
                  />
                  <Button
                    onClick={addFriend}
                    className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border-0"
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Friends List */}
            <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
              <CardHeader>
                <CardTitle className="text-white">Your Friends</CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <p className="text-blue-200 text-center py-4">No friends added yet. Add one using the form above!</p>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">👤</div>
                          <div>
                            <p className="text-white">{friend.username}</p>
                            <p className="text-blue-200 text-sm">{friend.email}</p>
                          </div>
                        </div>
                        <div>
                          <span className={`font-medium ${((friend as any).balance ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            ₹{(Math.abs(((friend as any).balance ?? 0))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'groups' && (
          <>
            {/* Create Group */}
            <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Group
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="bg-white/10 border-blue-400/50 text-white placeholder:text-blue-200"
                />
                
                <div>
                  <p className="text-blue-200 mb-2">Select Members:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                        onClick={() => toggleMember(friend.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(friend.id)}
                          readOnly
                          className="text-blue-600"
                        />
                        <span className="text-white">{friend.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button
                  onClick={createGroup}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border-0"
                  disabled={!newGroupName || selectedMembers.length < 1}
                >
                  Create Group
                </Button>
              </CardContent>
            </Card>

            {/* Groups List */}
            <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
              <CardHeader>
                <CardTitle className="text-white">Your Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white">{group.name}</h3>
                        <div className="flex items-center gap-2 text-blue-200">
                          <DollarSign className="h-4 w-4" />
                          <span>₹{group.totalExpenses.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-300" />
                        <span className="text-blue-200 text-sm">
                          {group.members.length} members: {group.members.join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
