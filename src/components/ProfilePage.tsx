import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, User, Settings, Bell, CreditCard, Shield, LogOut, Edit2 } from 'lucide-react';
import { checkSession, getDashboardData, getExpenseSummary, updateProfile } from '../api';

interface ProfilePageProps {
  onBack: () => void;
  onLogout: () => void;
}

export function ProfilePage({ onBack, onLogout }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    currency: 'INR',
    defaultSplitMethod: 'equal'
  });
  
  const [notifications, setNotifications] = useState({
    expenseReminders: true,
    paymentAlerts: true,
    weeklyReports: false,
    friendRequests: true
  });

  const saveProfile = () => {
    // persist to backend
    (async () => {
      setIsEditing(false);
      try {
        await updateProfile({
          username: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          currency: profileData.currency,
          defaultSplitMethod: profileData.defaultSplitMethod,
        });
      } catch (err) {
        console.error('Failed to save profile', err);
      }
    })();
  };

  const [stats, setStats] = useState({
    totalExpenses: 0,
    expensesThisMonth: 0,
    friendsCount: 0,
    groupsCount: 0
  });

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      try {
        setLoading(true);
        const sessionRes = await checkSession();
        if (sessionRes?.data?.loggedIn && mounted) {
          const user = sessionRes.data.user || {};
          setProfileData(prev => ({ ...prev, name: user.username || '', email: user.email || '' }));
        }

        const dashboardRes = await getDashboardData();
        if (dashboardRes?.data && mounted) {
          setStats(prev => ({
            ...prev,
            friendsCount: dashboardRes.data.totalFriends || 0,
            groupsCount: dashboardRes.data.totalGroups || 0,
          }));
        }

        const summaryRes = await getExpenseSummary();
        if (summaryRes?.data && mounted) {
          setStats(prev => ({
            ...prev,
            totalExpenses: summaryRes.data.totalPaid || 0,
          }));
        }

        // For expensesThisMonth we can infer from recentExpenses length if available
        if (dashboardRes?.data?.recentExpenses && mounted) {
          setStats(prev => ({ ...prev, expensesThisMonth: dashboardRes.data.recentExpenses.length || 0 }));
        }
      } catch (err) {
        // quietly ignore -- UI will show defaults
        console.error('Failed to load profile data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchProfile();

    return () => { mounted = false; };
  }, []);

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
            Profile
          </h1>
        </div>

        {/* Profile Card */}
        <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
          <CardHeader className="text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <User className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-white text-2xl">{profileData.name}</CardTitle>
            <p className="text-blue-200">{profileData.email}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-2xl text-white">${stats.totalExpenses}</p>
                <p className="text-blue-200 text-sm">Total Expenses</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-2xl text-white">{stats.expensesThisMonth}</p>
                <p className="text-blue-200 text-sm">This Month</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-2xl text-white">{stats.friendsCount}</p>
                <p className="text-blue-200 text-sm">Friends</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <p className="text-2xl text-white">{stats.groupsCount}</p>
                <p className="text-blue-200 text-sm">Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <Button
              onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white border-0"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-blue-200 text-sm">Full Name</label>
                <Input
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/10 border-blue-400/50 text-white placeholder:text-blue-200"
                />
              </div>
              <div>
                <label className="text-blue-200 text-sm">Email</label>
                <Input
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/10 border-blue-400/50 text-white placeholder:text-blue-200"
                />
              </div>
              <div>
                <label className="text-blue-200 text-sm">Phone</label>
                <Input
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  disabled={!isEditing}
                  className="bg-white/10 border-blue-400/50 text-white placeholder:text-blue-200"
                />
              </div>
              <div>
                <label className="text-blue-200 text-sm">Currency</label>
                <Select
                  value={profileData.currency}
                  onValueChange={(value) => setProfileData({...profileData, currency: value})}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="bg-white/10 border-blue-400/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-blue-800 border-blue-600">
                    <SelectItem value="INR" className="text-white hover:bg-blue-700">INR (₹)</SelectItem>
                    {/* USD removed — INR is the default currency */}
                    <SelectItem value="EUR" className="text-white hover:bg-blue-700">EUR (€)</SelectItem>
                    <SelectItem value="GBP" className="text-white hover:bg-blue-700">GBP (£)</SelectItem>
                    <SelectItem value="JPY" className="text-white hover:bg-blue-700">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-blue-200 text-sm">Default Split Method</label>
              <Select
                value={profileData.defaultSplitMethod}
                onValueChange={(value) => setProfileData({...profileData, defaultSplitMethod: value})}
              >
                <SelectTrigger className="bg-white/10 border-blue-400/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-blue-800 border-blue-600">
                  <SelectItem value="equal" className="text-white hover:bg-blue-700">Equal Split</SelectItem>
                  <SelectItem value="percentage" className="text-white hover:bg-blue-700">By Percentage</SelectItem>
                  <SelectItem value="amount" className="text-white hover:bg-blue-700">By Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Expense Reminders</p>
                <p className="text-blue-200 text-sm">Get notified about pending expenses</p>
              </div>
              <Switch
                checked={notifications.expenseReminders}
                onCheckedChange={(checked) => setNotifications({...notifications, expenseReminders: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Payment Alerts</p>
                <p className="text-blue-200 text-sm">Notifications when friends pay you back</p>
              </div>
              <Switch
                checked={notifications.paymentAlerts}
                onCheckedChange={(checked) => setNotifications({...notifications, paymentAlerts: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Weekly Reports</p>
                <p className="text-blue-200 text-sm">Summary of your weekly expenses</p>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">Friend Requests</p>
                <p className="text-blue-200 text-sm">When someone adds you as a friend</p>
              </div>
              <Switch
                checked={notifications.friendRequests}
                onCheckedChange={(checked) => setNotifications({...notifications, friendRequests: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy */}
        <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 border-blue-400/50 text-white justify-start"
            >
              Change Password
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 border-blue-400/50 text-white justify-start"
            >
              Two-Factor Authentication
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 border-blue-400/50 text-white justify-start"
            >
              Privacy Settings
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 border-blue-400/50 text-white justify-start"
            >
              Export Data
            </Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="bg-white/10 backdrop-blur-md border-blue-400/30">
          <CardContent className="pt-6">
            <Button
              onClick={onLogout}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white border-0"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}