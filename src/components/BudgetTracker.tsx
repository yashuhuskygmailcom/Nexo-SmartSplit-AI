import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ArrowLeft, Target, TrendingUp, TrendingDown, Plus, Edit2, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../api';
import { toast } from './ui/use-toast';

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

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  paid_by: number;
  splits: { user_id: number; amount_owed: number }[];
  groupId?: number;
  budgetCategoryId: number | null;
}

export function BudgetTracker({ onBack }: BudgetTrackerProps) {
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [newBudget, setNewBudget] = useState({ name: '', amount: '', category: 'food' });
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [budgetsRes, expensesRes] = await Promise.all([
        api.getBudgets(),
        api.getExpenses(),
      ]);
      
      // Transform budgets to include spent from expenses
      const budgetsData = budgetsRes.data || [];
      const expensesData: Expense[] = expensesRes.data || [];

      const transformedBudgets = budgetsData.map((b: any) => {
        // Calculate spent for this budget from expenses with matching budget_category_id
        const spent = expensesData.reduce((total: number, exp: Expense) => {
          if (exp.budgetCategoryId === b.id) {
            return total + exp.amount;
          }
          return total;
        }, 0);

        return {
          id: b.id.toString(),
          name: b.name,
          budget: b.budget_amount,
          spent: spent, // Calculated from expenses
          icon: b.icon || '💰',
          color: b.color || 'from-slate-500 to-slate-600'
        };
      });
      
      setBudgets(transformedBudgets);
      setExpenses(expensesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: 'Error',
        description: 'Failed to load budgets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate this month's total spent from actual expenses
  const thisMonthSpent = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.reduce((total, exp) => {
      const expDate = new Date(exp.date);
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        return total + exp.amount;
      }
      return total;
    }, 0);
  }, [expenses]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0);
  const totalSpent = thisMonthSpent; // Use actual expenses from this month
  const remainingBudget = totalBudget - totalSpent;

  // Generate graph data - cumulative spending vs budget for this month
  const graphData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dailySpending: { [key: number]: number } = {};

    // Initialize all days with 0
    for (let i = 1; i <= daysInMonth; i++) {
      dailySpending[i] = 0;
    }

    // Sum expenses by day
    expenses.forEach((exp: Expense) => {
      const expDate = new Date(exp.date);
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        const day = expDate.getDate();
        dailySpending[day] = (dailySpending[day] || 0) + exp.amount;
      }
    });

    // Calculate cumulative spending and daily budget allocation
    const chartData = [];
    let cumulativeSpent = 0;
    const dailyBudget = totalBudget / daysInMonth;

    for (let i = 1; i <= daysInMonth; i++) {
      cumulativeSpent += dailySpending[i] || 0;
      const cumulativeBudget = dailyBudget * i;

      chartData.push({
        name: `${i}`,
        spent: cumulativeSpent,
        budget: cumulativeBudget
      });
    }

    return chartData.length > 0 ? chartData : [{ name: 'No data', spent: 0, budget: 0 }];
  }, [expenses, totalBudget]);

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

  const addBudget = async () => {
    if (newBudget.name && newBudget.amount) {
      try {
        const response = await api.createBudget(
          newBudget.name,
          parseFloat(newBudget.amount),
          '💰',
          'from-slate-500 to-slate-600'
        );
        
        const newBudgetData: BudgetCategory = {
          id: response.data.id.toString(),
          name: response.data.name,
          budget: response.data.budget_amount,
          spent: 0,
          icon: response.data.icon,
          color: response.data.color,
        };
        
        setBudgets([...budgets, newBudgetData]);
        setNewBudget({ name: '', amount: '', category: 'food' });
        setIsAddingBudget(false);
        toast({
          title: 'Success',
          description: 'Budget created successfully',
        });
      } catch (error) {
        console.error("Error creating budget:", error);
        toast({
          title: 'Error',
          description: 'Failed to create budget',
          variant: 'destructive'
        });
      }
    }
  };

  const openEditDialog = (budget: BudgetCategory) => {
    setEditingBudgetId(budget.id);
    setEditingBudgetAmount(budget.budget.toString());
    setIsEditDialogOpen(true);
  };

  const updateSpentAmount = (budgetId: string, newSpent: number) => {
    setBudgets(budgets.map(b => (b.id === budgetId ? { ...b, spent: newSpent } : b)));
    setIsEditDialogOpen(false);
    setEditingBudgetId(null);
    setEditingBudgetAmount('');
  };

  const updateBudgetAmount = async (budgetId: string, newBudgetAmount: number) => {
    try {
      const budget = budgets.find(b => b.id === budgetId);
      if (!budget) return;
      
      await api.updateBudget(budgetId, budget.name, newBudgetAmount, budget.icon, budget.color);
      setBudgets(budgets.map(b => (b.id === budgetId ? { ...b, budget: newBudgetAmount } : b)));
      setIsEditDialogOpen(false);
      setEditingBudgetId(null);
      setEditingBudgetAmount('');
      toast({
        title: 'Success',
        description: 'Budget limit updated',
      });
    } catch (error) {
      console.error("Error updating budget:", error);
      toast({
        title: 'Error',
        description: 'Failed to update budget',
        variant: 'destructive'
      });
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await api.deleteBudget(id);
      setBudgets(budgets.filter(b => b.id !== id));
      toast({
        title: 'Success',
        description: 'Budget deleted',
      });
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast({
        title: 'Error',
        description: 'Failed to delete budget',
        variant: 'destructive'
      });
    }
  };

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-200 font-light tracking-wide">Budget Overview</CardTitle>
            <Button onClick={fetchAllData} size="sm" className="bg-gradient-to-r from-blue-600/80 to-slate-600/80 hover:from-blue-500/80 hover:to-slate-500/80 text-white border-0 rounded-lg">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardHeader>
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

        {/* Monthly Spending Graph */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 font-light tracking-wide">This Month's Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">Loading spending data...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} label={{ value: 'Day of Month', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis stroke="#94A3B8" fontSize={12} label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      border: '1px solid #475569',
                      borderRadius: '12px',
                      color: '#E2E8F0',
                      fontSize: '14px'
                    }}
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#60A5FA"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#60A5FA', strokeWidth: 0 }}
                    name="Spent"
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#10B981', strokeWidth: 0 }}
                    name="Budget"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
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

              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
                <p className="text-xs text-blue-300">💡 <strong>Tip:</strong> Spending is calculated from actual expenses. Create expenses in the Splitter to track spending.</p>
              </div>

              {editingBudgetId && (
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-600/30 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Current Budget Limit:</span>
                    <span className="text-slate-200">₹{editingBudgetAmount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Current Spending:</span>
                    <span className="text-slate-200">₹{budgets.find(b => b.id === editingBudgetId)?.spent.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-slate-600/30">
                    <span className="text-slate-400">Remaining:</span>
                    <span className={`font-medium ${parseFloat(editingBudgetAmount || '0') - (budgets.find(b => b.id === editingBudgetId)?.spent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{(parseFloat(editingBudgetAmount || '0') - (budgets.find(b => b.id === editingBudgetId)?.spent || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Usage:</span>
                    <span className="text-slate-200">{parseFloat(editingBudgetAmount || '0') > 0 ? (((budgets.find(b => b.id === editingBudgetId)?.spent || 0) / parseFloat(editingBudgetAmount || '1')) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={() => {
                  if (editingBudgetId && editingBudgetAmount) {
                    updateBudgetAmount(editingBudgetId, parseFloat(editingBudgetAmount));
                  }
                }} className="flex-1 bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500/80 hover:to-emerald-500/80 text-white border-0 rounded-lg">Save Budget Limit</Button>
                <Button onClick={() => setIsEditDialogOpen(false)} variant="outline" className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 border-slate-600/50 text-slate-200 rounded-lg">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}