import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowLeft, Plus, Send, History, Wallet as WalletIcon } from 'lucide-react';
import { getWallet, addWalletFunds, getWalletTransactions } from '../api';
import { toast } from './ui/use-toast';

interface WalletProps {
  onBack: () => void;
}

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

export function Wallet({ onBack }: WalletProps) {
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [addAmount, setAddAmount] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      setIsLoading(true);
      const res = await getWallet();
      setBalance(res.data.balance || 0);
      setCurrency(res.data.currency || 'INR');
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await getWalletTransactions();
      setTransactions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleAddFunds = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      toast({
        title: 'Error',
        description: 'Enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAdding(true);
      await addWalletFunds(parseFloat(addAmount), 'Added funds');
      setAddAmount('');
      await fetchWallet();
      await fetchTransactions();
      toast({
        title: 'Success',
        description: `Added ₹${parseFloat(addAmount).toFixed(2)} to wallet`,
      });
    } catch (error) {
      console.error('Failed to add funds:', error);
      toast({
        title: 'Error',
        description: 'Failed to add funds',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4 flex items-center justify-center">
        <div className="text-slate-200">Loading wallet...</div>
      </div>
    );
  }

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
            My Wallet
          </h1>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-slate-800/60 to-blue-900/60 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <WalletIcon className="h-8 w-8 text-blue-300" />
                <p className="text-slate-400 text-lg">Available Balance</p>
              </div>
              <p className="text-6xl font-light text-slate-200 mb-2">
                ₹{balance.toFixed(2)}
              </p>
              <p className="text-slate-500 text-sm">INR</p>
            </div>
          </CardContent>
        </Card>

        {/* Add Funds Card */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <Plus className="h-4 w-4 text-green-300" />
              </div>
              Add Funds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter amount"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-slate-200 placeholder:text-slate-400"
              />
              <Button
                onClick={handleAddFunds}
                disabled={isAdding}
                className="bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500/80 hover:to-emerald-500/80 text-white border-0 rounded-lg"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isAdding ? 'Adding...' : 'Add'}
              </Button>
            </div>
            <p className="text-slate-400 text-sm">
              Add virtual money to your wallet for quick payments
            </p>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <History className="h-4 w-4 text-purple-300" />
              </div>
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-all duration-300 border border-slate-600/20"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          txn.type === 'credit'
                            ? 'bg-green-500/20'
                            : 'bg-red-500/20'
                        }`}
                      >
                        {txn.type === 'credit' ? (
                          <Plus className={`h-5 w-5 ${txn.type === 'credit' ? 'text-green-400' : 'text-red-400'}`} />
                        ) : (
                          <Send className={`h-5 w-5 ${txn.type === 'credit' ? 'text-green-400' : 'text-red-400'}`} />
                        )}
                      </div>
                      <div>
                        <p className="text-slate-200 font-medium">{txn.description}</p>
                        <p className="text-slate-400 text-xs">{formatDate(txn.created_at)}</p>
                      </div>
                    </div>
                    <p
                      className={`text-lg font-medium ${
                        txn.type === 'credit' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-blue-900/20 backdrop-blur-xl border-blue-600/30">
          <CardContent className="p-6">
            <h3 className="text-slate-200 font-medium mb-2">💡 How Wallet Works</h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li>✓ Add funds to your wallet anytime</li>
              <li>✓ Use wallet balance to settle debts with friends</li>
              <li>✓ Pay pending payment reminders instantly</li>
              <li>✓ Track all transactions in history</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
