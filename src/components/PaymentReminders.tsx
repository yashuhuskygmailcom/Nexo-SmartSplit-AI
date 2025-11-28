import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Bell, Clock, ArrowLeft } from 'lucide-react';

interface PaymentRemindersProps {
  onBack: () => void;
}

interface Reminder {
  id: string;
  friendName: string;
  amount: number;
  dueDate: string;
  description: string;
  avatar: string;
}

const mockReminders: Reminder[] = [
  {
    id: '1',
    friendName: 'Alice Johnson',
    amount: 25.50,
    dueDate: '2024-10-05',
    description: 'Dinner at Italian Restaurant',
    avatar: '👩'
  },
  {
    id: '2',
    friendName: 'Bob Smith',
    amount: 18.75,
    dueDate: '2024-10-03',
    description: 'Coffee and Lunch',
    avatar: '👨'
  },
  {
    id: '3',
    friendName: 'Carol Davis',
    amount: 12.00,
    dueDate: '2024-10-07',
    description: 'Movie Tickets',
    avatar: '👩‍🦱'
  }
];

export function PaymentReminders({ onBack }: PaymentRemindersProps) {
  const sendReminder = (friendName: string, amount: number) => {
    // Mock sending reminder
    alert(`Reminder sent to ${friendName} for $${amount.toFixed(2)}`);
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
            Payment Reminders
          </h1>
        </div>

        {/* Pending Reminders */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <Bell className="h-4 w-4 text-blue-300" />
              </div>
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockReminders.map((reminder) => (
                <div key={reminder.id} className="group">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-all duration-300 border border-slate-600/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-xl flex items-center justify-center text-xl">
                        {reminder.avatar}
                      </div>
                      <div>
                        <p className="text-slate-200 font-medium">{reminder.friendName}</p>
                        <p className="text-slate-400 text-sm">{reminder.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span className="text-slate-500 text-xs">Due: {reminder.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-slate-200 font-medium">${reminder.amount.toFixed(2)}</p>
                        <p className="text-slate-400 text-sm">Owes you</p>
                      </div>
                      <Button
                        onClick={() => sendReminder(reminder.friendName, reminder.amount)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600/80 to-slate-600/80 hover:from-blue-500/80 hover:to-slate-500/80 text-white border-0 rounded-lg transition-all duration-300"
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Remind
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 font-light">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="h-16 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-slate-200 rounded-xl justify-start" variant="outline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                  <Bell className="h-4 w-4 text-orange-300" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Send All Reminders</p>
                  <p className="text-slate-400 text-sm">Notify all pending payments</p>
                </div>
              </div>
            </Button>
            
            <Button className="h-16 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-slate-200 rounded-xl justify-start" variant="outline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-green-300" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Schedule Reminders</p>
                  <p className="text-slate-400 text-sm">Set up automatic reminders</p>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}