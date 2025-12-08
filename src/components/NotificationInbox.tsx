import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Bell, Check, ArrowLeft, CheckCheck } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getNotifications, markNotificationAsRead, checkSession } from '../api';

interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationInboxProps {
  onClose: () => void;
}

export function NotificationInbox({ onClose }: NotificationInboxProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null);

  // Get user ID from session
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const sessionRes = await checkSession();
        setCurrentUser(sessionRes.data.user);
      } catch (err) {
        console.error('Failed to get current user:', err);
        setError('Failed to authenticate user');
      }
    };
    fetchCurrentUser();
  }, []);

  const userId = currentUser?.id || null;

  // Use WebSocket hook for real-time notifications
  const { notifications: wsNotifications, isConnected, markAsRead } = useWebSocket(userId);

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Update local notifications when WebSocket notifications arrive
  useEffect(() => {
    if (wsNotifications.length > 0) {
      setNotifications(prev => [...wsNotifications, ...prev]);
    }
  }, [wsNotifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await getNotifications();
      setNotifications(response.data);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      markAsRead(notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    for (const notification of unreadNotifications) {
      await handleMarkAsRead(notification.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 border-blue-400/30 text-white backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-400/30">
              <Bell className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl bg-gradient-to-r from-blue-300 via-blue-200 to-slate-200 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-blue-300/70">Stay updated with payment reminders and updates</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications Area */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 backdrop-blur-md border-blue-400/20 min-h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0 border-b border-blue-400/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-300" />
                  Your Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">
                      {unreadCount} unread
                    </span>
                  )}
                  {!isConnected && (
                    <span className="ml-2 text-xs bg-yellow-600/20 text-yellow-300 px-2 py-1 rounded-full">
                      Offline
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 py-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                        <span className="ml-3 text-blue-300">Loading notifications...</span>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <p className="text-red-300 mb-4">{error}</p>
                        <Button
                          onClick={fetchNotifications}
                          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border-0"
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-500/20 to-slate-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Bell className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-400 text-lg">No notifications yet</p>
                        <p className="text-sm text-slate-500 mt-2">Payment reminders and updates will appear here</p>
                      </div>
                    ) : (
                      <>
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`flex gap-4 p-4 rounded-2xl transition-all duration-300 ${
                              !notification.is_read
                                ? 'bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-400/30'
                                : 'bg-white/5 border border-blue-400/20'
                            }`}
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-400/30 flex items-center justify-center">
                              <Bell className="h-6 w-6 text-blue-300" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium text-white">{notification.title}</h3>
                                <div className="flex items-center gap-2">
                                  {!notification.is_read && (
                                    <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                                  )}
                                  <span className="text-xs text-blue-300/50">
                                    {formatDate(notification.created_at)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-slate-300 leading-relaxed mb-3">{notification.message}</p>
                              {!notification.is_read && (
                                <Button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  size="sm"
                                  className="bg-gradient-to-r from-green-600/80 to-blue-600/80 hover:from-green-500/80 hover:to-blue-500/80 text-white border-0 rounded-lg"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark as Read
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>

                {notifications.length > 0 && unreadCount > 0 && (
                  <div className="px-6 py-3 border-t border-blue-400/20 bg-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300/70 text-sm">
                        {notifications.length} total notifications
                      </span>
                      <Button
                        onClick={handleMarkAllAsRead}
                        size="sm"
                        className="bg-gradient-to-r from-green-600/80 to-blue-600/80 hover:from-green-500/80 hover:to-blue-500/80 text-white border-0"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Mark All Read
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
              <CardHeader>
                <CardTitle className="text-white">Notification Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-lg flex items-center justify-center text-sm">
                      💰
                    </div>
                    <div>
                      <h3 className="text-blue-200 text-sm font-medium">Payment Reminders</h3>
                      <p className="text-blue-300/70 text-xs">Notifications about pending payments from shared expenses</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-slate-500/20 rounded-lg flex items-center justify-center text-sm">
                      ✅
                    </div>
                    <div>
                      <h3 className="text-blue-200 text-sm font-medium">Settlement Updates</h3>
                      <p className="text-blue-300/70 text-xs">When payments are made or balances are settled</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-slate-500/20 rounded-lg flex items-center justify-center text-sm">
                      👥
                    </div>
                    <div>
                      <h3 className="text-blue-200 text-sm font-medium">Group Updates</h3>
                      <p className="text-blue-300/70 text-xs">New expenses added to groups you're part of</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-md border-blue-400/20 mt-4">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    onClick={fetchNotifications}
                    className="w-full bg-gradient-to-r from-blue-600/80 to-slate-600/80 hover:from-blue-500/80 hover:to-slate-500/80 text-white border-0 rounded-lg justify-start"
                    variant="outline"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Refresh Notifications
                  </Button>
                  <Button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-slate-600/80 to-slate-700/80 hover:from-slate-500/80 hover:to-slate-600/80 text-white border-0 rounded-lg justify-start"
                    variant="outline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
