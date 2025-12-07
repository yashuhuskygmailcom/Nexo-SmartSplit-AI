import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Bell, Clock, ArrowLeft, Wallet, RefreshCw } from 'lucide-react';
import * as api from '../api';
import { toast } from './ui/use-toast';

interface PaymentRemindersProps {
  onBack: () => void;
}

interface Reminder {
  id: number;
  amount: number;
  due_date: string | null;
  description: string;
  paid: number;
  created_at: string;
}

export function PaymentReminders({ onBack }: PaymentRemindersProps) {
  const [payingId, setPayingId] = useState<number | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await api.getPaymentReminders();
      setReminders(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payment reminders',
        variant: 'destructive'
      });
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = (friendName: string, amount: number) => {
    toast({
      title: 'Success',
      description: `Reminder sent to ${friendName} for ₹${amount.toFixed(2)}`,
    });
  };

  const handlePayFromWallet = async (reminderId: number, amount: number) => {
    setPayingId(reminderId);
    try {
      const result = await api.payDebtFromWallet(amount, undefined, `Payment reminder`);
      toast({
        title: 'Success',
        description: `Paid ₹${amount.toFixed(2)} from wallet`,
      });
      // Mark the reminder as paid and refresh the list
      await api.updatePaymentReminder(reminderId, amount, undefined, undefined, true);
      await fetchReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to pay from wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setPayingId(null);
    }
  };

  const handleSendAllReminders = async () => {
    try {
      const response = await api.sendAllReminders();
      toast({
        title: 'Success',
        description: `Sent ${response.data.sent} reminders successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send all reminders',
        variant: 'destructive'
      });
      console.error('Error sending all reminders:', error);
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
            Payment Reminders
          </h1>
        </div>

        {/* Pending Reminders */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <Bell className="h-4 w-4 text-blue-300" />
              </div>
              Pending Payments
            </CardTitle>
            <Button onClick={fetchReminders} size="sm" className="bg-gradient-to-r from-blue-600/80 to-slate-600/80 hover:from-blue-500/80 hover:to-slate-500/80 text-white border-0 rounded-lg">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Loading payment reminders...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reminders.filter(r => Number(r.paid) === 0).map((reminder) => (
                  <div key={reminder.id} className="group">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-all duration-300 border border-slate-600/20">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-xl flex items-center justify-center text-xl">
                          💰
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">Payment Reminder</p>
                          <p className="text-slate-400 text-sm">{reminder.description || 'No description'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span className="text-slate-500 text-xs">
                              Due: {reminder.due_date ? new Date(reminder.due_date).toLocaleDateString() : 'No due date'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-slate-200 font-medium">₹{reminder.amount.toFixed(2)}</p>
                          <p className="text-slate-400 text-sm">Amount due</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePayFromWallet(reminder.id, reminder.amount)}
                            disabled={payingId === reminder.id}
                            size="sm"
                            className="bg-gradient-to-r from-cyan-600/80 to-slate-600/80 hover:from-cyan-500/80 hover:to-slate-500/80 text-white border-0 rounded-lg transition-all duration-300"
                          >
                            <Wallet className="h-3 w-3 mr-1" />
                            {payingId === reminder.id ? 'Paying...' : 'Pay'}
                          </Button>
                          <Button
                            onClick={() => sendReminder('Recipient', reminder.amount)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-600/80 to-slate-600/80 hover:from-blue-500/80 hover:to-slate-500/80 text-white border-0 rounded-lg transition-all duration-300"
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            Remind
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {reminders.filter(r => r.paid === 0).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No pending payment reminders</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 font-light">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleSendAllReminders}
              className="h-16 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-slate-200 rounded-xl justify-start"
              variant="outline"
            >
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