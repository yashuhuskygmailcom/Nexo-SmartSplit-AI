import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ArrowLeft, Target, TrendingUp, TrendingDown, Plus, Edit2, AlertTriangle, Trash2 } from 'lucide-react';

interface BudgetTrackerProps {
  onBack: () => void;
}

interface BudgetCategory {
  id: string;
  name: string;
  budget: number;
  spent: number;
  icon: string;
  color: string;
}

const mockBudgets: BudgetCategory[] = [
  { id: '1', name: 'Food & Dining', budget: 400, spent: 325, icon: '🍽️', color: 'from-orange-500 to-red-500' },
  { id: '2', name: 'Entertainment', budget: 200, spent: 150, icon: '🎬', color: 'from-purple-500 to-pink-500' },
  { id: '3', name: 'Transportation', budget: 150, spent: 89, icon: '🚗', color: 'from-blue-500 to-cyan-500' },
  { id: '4', name: 'Shopping', budget: 300, spent: 425, icon: '🛍️', color: 'from-green-500 to-emerald-500' },
  { id: '5', name: 'Health & Fitness', budget: 100, spent: 45, icon: '💪', color: 'from-teal-500 to-green-500' },
];

export function BudgetTracker({ onBack }: BudgetTrackerProps) {
  const [budgets, setBudgets] = useState<BudgetCategory[]>(mockBudgets);
  const [newBudget, setNewBudget] = useState({ name: '', amount: '', category: 'food' });
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingSpentAmount, setEditingSpentAmount] = useState('');
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remainingBudget = totalBudget - totalSpent;

  const getProgressColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return 'from-red-500 to-red-600';
    if (percentage > 80) return 'from-orange-500 to-orange-600';
    if (percentage > 60) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage > 100) return { status: 'Over Budget', color: 'text-red-400' };
    if (percentage > 80) return { status: 'Almost Exceeded', color: 'text-orange-400' };
    if (percentage > 60) return { status: 'On Track', color: 'text-yellow-400' };
    return { status: 'Good', color: 'text-green-400' };
  };

  const addBudget = () => {
    if (newBudget.name && newBudget.amount) {
      const b: BudgetCategory = {
        id: Date.now().toString(),
        name: newBudget.name,
        budget: parseFloat(newBudget.amount),
        spent: 0,
        icon: '💰',
        color: 'from-slate-500 to-slate-600',
      };
      setBudgets([...budgets, b]);
      setNewBudget({ name: '', amount: '', category: 'food' });
      setIsAddingBudget(false);
    }
  };

  const openEditDialog = (budget: BudgetCategory) => {
    setEditingBudgetId(budget.id);
    setEditingSpentAmount(budget.spent.toString());
    setEditingBudgetAmount(budget.budget.toString());
    setIsEditDialogOpen(true);
  };

  const updateSpentAmount = (budgetId: string, newSpent: number) => {
    setBudgets(budgets.map(b => (b.id === budgetId ? { ...b, spent: newSpent } : b)));
    setIsEditDialogOpen(false);
    setEditingBudgetId(null);
    setEditingSpentAmount('');
    setEditingBudgetAmount('');
  };

  const updateBudgetAmount = (budgetId: string, newBudget: number) => {
    setBudgets(budgets.map(b => (b.id === budgetId ? { ...b, budget: newBudget } : b)));
    setIsEditDialogOpen(false);
    setEditingBudgetId(null);
    setEditingBudgetAmount('');
    setEditingSpentAmount('');
  };

  const deleteBudget = (id: string) => setBudgets(budgets.filter(b => b.id !== id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} className="bg-slate-800/60 hover:bg-slate-700/60 border-slate-600/50 text-slate-200" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl bg-gradient-to-r from-slate-200 to-blue-200 bg-clip-text text-transparent font-light tracking-wide">Budget Boss</h1>
        </div>

        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-slate-500/10 rounded-xl border border-blue-500/20">
                <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">₹{totalBudget}</p>
                <p className="text-slate-400 text-sm">Total Budget</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
                <TrendingUp className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl text-slate-200 font-light">₹{totalSpent}</p>
                <p className="text-slate-400 text-sm">Total Spent</p>
              </div>

              <div
                className={`text-center p-4 rounded-xl border ${
                  remainingBudget >= 0 ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20' : 'bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20'
                }`}>
                <TrendingDown className={`h-8 w-8 mx-auto mb-2 ${remainingBudget >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                <p className={`text-2xl font-light ${remainingBudget >= 0 ? 'text-green-200' : 'text-red-200'}`}>₹{Math.abs(remainingBudget)}</p>
                <p className="text-slate-400 text-sm">{remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                <div className="h-8 w-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-400 font-medium">%</span>
                </div>
                <p className="text-2xl text-slate-200 font-light">{((totalSpent / Math.max(totalBudget, 1)) * 100).toFixed(0)}%</p>
                <p className="text-slate-400 text-sm">Budget Used</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-200 flex items-center gap-3 font-light">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <Plus className="h-4 w-4 text-blue-300" />
              </div>
              Add Budget Category
            </CardTitle>
            <Button onClick={() => setIsAddingBudget(!isAddingBudget)} size="sm" className="bg-gradient-to-r from-blue-600/80 to-slate-600/80 hover:from-blue-500/80 hover:to-slate-500/80 text-white border-0 rounded-lg">
              <Plus className="h-4 w-4 mr-1" />
              {isAddingBudget ? 'Cancel' : 'Add Budget'}
            </Button>
          </CardHeader>

          {isAddingBudget && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="Budget category name" value={newBudget.name} onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })} className="bg-slate-700/50 border-slate-600/50 text-slate-200 placeholder:text-slate-400" />
                <Input type="number" placeholder="Budget amount" value={newBudget.amount} onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })} className="bg-slate-700/50 border-slate-600/50 text-slate-200 placeholder:text-slate-400" />
                <Button onClick={addBudget} className="bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500/80 hover:to-emerald-500/80 text-white border-0 rounded-lg">Add Budget</Button>
              </div>
            </CardContent>
          )}

        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((budget) => {
            const percentage = Math.min((budget.spent / Math.max(budget.budget, 1)) * 100, 100);
            const status = getBudgetStatus(budget.spent, budget.budget);
            return (
              <Card key={budget.id} className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{budget.icon}</div>
                      <div>
                        <CardTitle className="text-slate-200 font-medium">{budget.name}</CardTitle>
                        <p className={`text-sm ${status.color}`}>{status.status}</p>
                      </div>
                    </div>
                    {budget.spent > budget.budget && <AlertTriangle className="h-5 w-5 text-red-400" />}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Spent</span>
                      <span className="text-slate-200">₹{budget.spent} / ₹{budget.budget}</span>
                    </div>

                    <div className="w-full bg-slate-600/30 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${getProgressColor(budget.spent, budget.budget)} transition-all duration-500 ease-out`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{percentage.toFixed(0)}% used</span>
                      <span className={`${budget.spent <= budget.budget ? 'text-green-400' : 'text-red-400'}`}>
                        {budget.spent <= budget.budget ? `₹${(budget.budget - budget.spent).toFixed(0)} left` : `₹${(budget.spent - budget.budget).toFixed(0)} over`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openEditDialog(budget)} className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/50 text-slate-200 rounded-lg"><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteBudget(budget.id)} className="bg-slate-700/50 hover:bg-red-600/50 border-slate-600/50 text-slate-200 hover:text-red-300 rounded-lg"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-600/50">
            <DialogHeader>
              <DialogTitle className="text-slate-200">Edit Budget - {budgets.find(b => b.id === editingBudgetId)?.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Budget Limit (₹)</label>
                <Input type="number" placeholder="Enter budget limit" value={editingBudgetAmount} onChange={(e) => setEditingBudgetAmount(e.target.value)} className="bg-slate-800/50 border-slate-600/50 text-slate-200 placeholder:text-slate-500" />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Amount Spent (₹)</label>
                <Input type="number" placeholder="Enter amount spent" value={editingSpentAmount} onChange={(e) => setEditingSpentAmount(e.target.value)} className="bg-slate-800/50 border-slate-600/50 text-slate-200 placeholder:text-slate-500" />
              </div>

              {editingBudgetId && (
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-600/30 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Budget Limit:</span>
                    <span className="text-slate-200">₹{editingBudgetAmount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Amount Spent:</span>
                    <span className="text-slate-200">₹{editingSpentAmount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-slate-600/30">
                    <span className="text-slate-400">Remaining:</span>
                    <span className={`font-medium ${parseFloat(editingBudgetAmount || '0') - parseFloat(editingSpentAmount || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{(parseFloat(editingBudgetAmount || '0') - parseFloat(editingSpentAmount || '0')).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Usage:</span>
                    <span className="text-slate-200">{parseFloat(editingBudgetAmount || '0') > 0 ? ((parseFloat(editingSpentAmount || '0') / parseFloat(editingBudgetAmount || '1')) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={() => {
                  if (editingBudgetId && editingBudgetAmount && editingSpentAmount) {
                    updateBudgetAmount(editingBudgetId, parseFloat(editingBudgetAmount));
                    updateSpentAmount(editingBudgetId, parseFloat(editingSpentAmount));
                  }
                }} className="flex-1 bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500/80 hover:to-emerald-500/80 text-white border-0 rounded-lg">Save Changes</Button>
                <Button onClick={() => setIsEditDialogOpen(false)} variant="outline" className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 border-slate-600/50 text-slate-200 rounded-lg">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}