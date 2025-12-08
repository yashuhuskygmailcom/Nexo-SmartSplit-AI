import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface NotificationData {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const useWebSocket = (userId: number | null) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    socketRef.current = io('http://localhost:10000', {
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      // Join user-specific room
      socket.emit('join', userId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    // Notification events
    socket.on('notification', (notification: NotificationData) => {
      console.log('Received notification:', notification);
      setNotifications(prev => [notification, ...prev]);
    });

    socket.on('notification_read', (notificationId: number) => {
      console.log('Notification marked as read:', notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const markAsRead = (notificationId: number) => {
    if (socketRef.current) {
      socketRef.current.emit('mark_read', { notificationId, userId });
    }
  };

  return {
    notifications,
    isConnected,
    markAsRead,
  };
};
