import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ExtractedData } from '../App';

// Interfaces matching the backend schema
interface User {
  id: number;
  username: string;
  email: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  paid_by: number; // This is a user ID
  splits: { user_id: number; amount_owed: number }[];
  groupId?: number;
}

interface Group {
  id: number;
  name: string;
  members: string[]; // Usernames
  totalExpenses: number;
}

interface BudgetCategory {
  id: number;
  name: string;
  budget_amount: number;
  icon: string;
  color: string;
}

export function ExpenseSplitter({ onBack, initialData, setInitialData }: { onBack: () => void; initialData?: ExtractedData | null, setInitialData: (data: ExtractedData | null) => void }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paidBy: '', 
    participantIds: [] as number[],
    groupId: '',
    payFromWallet: false,
    budgetCategory: '',
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    memberIds: [] as number[],
  });

  const [showParticipantDialog, setShowParticipantDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (initialData) {
      setNewExpense(prev => ({
        ...prev,
        description: initialData.merchantName,
        amount: initialData.total.toString(),
      }));
    }
  }, [initialData]);

  const fetchInitialData = async () => {
    try {
      const sessionRes = await api.checkSession();
      const user = sessionRes.data.user;
      setCurrentUser(user);
      
      // Set initial state that depends on the user
      setNewExpense(prev => ({ ...prev, paidBy: user.id.toString(), participantIds: [user.id] }));
      setNewGroup(prev => ({ ...prev, memberIds: [user.id] }));

      const [expensesRes, friendsRes, groupsRes, budgetsRes] = await Promise.all([
        api.getExpenses(),
        api.getFriends(),
        api.getGroups(),
        api.getBudgets(),
      ]);

      setExpenses(expensesRes.data);
      setFriends([user, ...friendsRes.data]); // Add current user to friends list for selections
      setGroups(groupsRes.data);
      setBudgetCategories(budgetsRes.data || []);

    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const refreshData = async () => {
    try {
        const [expensesRes, groupsRes] = await Promise.all([api.getExpenses(), api.getGroups()]);
        setExpenses(expensesRes.data);
        setGroups(groupsRes.data);
    } catch (error) {
        console.error("Error refreshing data:", error);
    }
  };

  const getUsername = (id: number) => friends.find(f => f.id === id)?.username || 'Unknown User';

  const toggleParticipant = (friendId: number) => {
    if (friendId === currentUser?.id) return; // Current user can't be deselected
    
    const participantIds = newExpense.participantIds.includes(friendId)
      ? newExpense.participantIds.filter(pId => pId !== friendId)
      : [...newExpense.participantIds, friendId];
    
    setNewExpense({ ...newExpense, participantIds });
  };

  const toggleGroupMember = (friendId: number) => {
    if (friendId === currentUser?.id) return;
    const memberIds = newGroup.memberIds.includes(friendId)
      ? newGroup.memberIds.filter(id => id !== friendId)
      : [...newGroup.memberIds, friendId];
    setNewGroup({ ...newGroup, memberIds });
  };

  const selectGroupForExpense = (groupId: string) => {
    if (groupId === 'custom') {
      setNewExpense({ 
        ...newExpense, 
        groupId: '',
        participantIds: currentUser ? [currentUser.id] : []
      });
    } else {
      const group = groups.find(g => g.id.toString() === groupId);
      if (group) {
        // The `members` in the group are usernames. We need to find their IDs from the `friends` list.
        const memberIds = friends
          .filter(f => group.members.includes(f.username))
          .map(f => f.id);

        setNewExpense({ 
          ...newExpense, 
          groupId: group.id.toString(),
          participantIds: [...new Set([...memberIds, ...(currentUser ? [currentUser.id] : [])])], // Ensure creator is in
        });
      }
    }
  };

  const createGroupHandler = async () => {
    if (newGroup.name && newGroup.memberIds.length > 1) {
      try {
        await api.createGroup({ name: newGroup.name, members: newGroup.memberIds });
        refreshData();
        setNewGroup({ name: '', memberIds: currentUser ? [currentUser.id] : [] });
        setShowGroupDialog(false);
      } catch (error) {
        console.error("Error creating group:", error);
      }
    }
  };

  const addExpenseHandler = async () => {
    const { description, amount, paidBy, participantIds, payFromWallet, budgetCategory } = newExpense;
    if (description && amount && participantIds.length > 0 && paidBy) {
      const parsedAmount = parseFloat(amount);
      const splitAmount = parsedAmount / participantIds.length;
      
      const expenseData = {
        description,
        amount: parsedAmount,
        date: new Date().toISOString().split('T')[0], // Use current date
        paid_by: parseInt(paidBy, 10),
        splits: participantIds.map(id => ({
          user_id: id,
          amount_owed: splitAmount,
        })),
        groupId: newExpense.groupId ? parseInt(newExpense.groupId, 10) : undefined,
        budgetCategory: budgetCategory ? parseInt(budgetCategory, 10) : null,
      };

      try {
        await api.createExpense(expenseData);
        
        // If user opted to pay from wallet, deduct the amount
        if (payFromWallet && parseInt(paidBy, 10) === currentUser?.id) {
          try {
            await api.payDebtFromWallet(parsedAmount, undefined, `Payment for expense: ${description}`);
          } catch (walletError) {
            console.error("Error paying from wallet:", walletError);
            // Continue even if wallet payment fails - expense is already created
            toast.error("Expense created but failed to deduct from wallet");
          }
        }
        
        refreshData();
        setNewExpense({
          description: '',
          amount: '',
          paidBy: currentUser ? currentUser.id.toString() : '',
          participantIds: currentUser ? [currentUser.id] : [],
          groupId: '',
          payFromWallet: false,
          budgetCategory: '',
        });
        setInitialData(null);
        toast.success('Expense added successfully');
      } catch (error) {
        console.error("Error adding expense:", error);
        toast.error("Failed to add expense");
      }
    }
  };

  const removeExpenseHandler = async (id: number) => {
    try {
      await api.deleteExpense(id.toString());
      refreshData();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  // Note: Backend doesn't support group deletion yet, so this is a placeholder.
  const removeGroup = (id: number) => {
    console.log("Group deletion not yet implemented on backend");
    // setGroups(groups.filter(g => g.id !== id));
  };

  const filteredExpenses = useMemo(() => {
    return selectedGroupFilter === 'all'
      ? expenses
      : expenses.filter(exp => exp.groupId?.toString() === selectedGroupFilter);
  }, [expenses, selectedGroupFilter]);

  const balances = useMemo(() => {
    const balances: { [key: number]: number } = {};
    friends.forEach(friend => { balances[friend.id] = 0; });

    filteredExpenses.forEach(expense => {
        const payerId = expense.paid_by;

        // The person who paid gets credit
        if (balances[payerId] !== undefined) {
            balances[payerId] += expense.amount;
        }

        // The participants owe money
        expense.splits.forEach(split => {
            if (balances[split.user_id] !== undefined) {
                balances[split.user_id] -= split.amount_owed;
            }
        });
    });

    return balances;
  }, [filteredExpenses, friends]);

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (!currentUser) {
    return <div>Loading...</div>; // Or a more sophisticated loading state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" className="bg-white/5 hover:bg-white/10 border-blue-400/30 text-white backdrop-blur-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl bg-gradient-to-r from-blue-300 via-blue-200 to-slate-200 bg-clip-text text-transparent">
            Expense Splitter
          </h1>
        </div>

        <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="bg-white/5 backdrop-blur-sm border border-blue-400/20">
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="space-y-6 mt-6">
                {/* Add Expense Form */}
                <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
                    <CardHeader><CardTitle className="text-white">Add New Expense</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input placeholder="Description" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="bg-white/5 border-blue-400/30 text-white" />
                            <Input type="number" placeholder="Amount" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="bg-white/5 border-blue-400/30 text-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select value={newExpense.paidBy} onValueChange={value => setNewExpense({...newExpense, paidBy: value})}>
                                <SelectTrigger className="bg-white/5 border-blue-400/30 text-white"><SelectValue placeholder="Paid by" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-blue-600">
                                    {friends.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.username}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={selectGroupForExpense} value={newExpense.groupId}>
                                <SelectTrigger className="bg-white/5 border-blue-400/30 text-white"><SelectValue placeholder="Select group or custom" /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-blue-600">
                                    <SelectItem value="custom">Custom Selection</SelectItem>
                                    {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                          <Select value={newExpense.budgetCategory} onValueChange={value => setNewExpense({...newExpense, budgetCategory: value})}>
                            <SelectTrigger className="bg-white/5 border-blue-400/30 text-white"><SelectValue placeholder="Select budget category (optional)" /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-blue-600">
                              {budgetCategories.map(bc => <SelectItem key={bc.id} value={bc.id.toString()}>{bc.icon} {bc.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {budgetCategories.length === 0 && (
                            <p className="text-xs text-slate-400 mt-2">💡 No budget categories yet. Create one in Budget Boss to track spending!</p>
                          )}
                          {budgetCategories.length > 0 && (
                            <p className="text-xs text-blue-300 mt-2">📊 Your budgets: {budgetCategories.map(bc => `${bc.icon} ${bc.name}`).join(', ')}</p>
                          )}
                        </div>
                        <div>
                          <Button onClick={() => setShowParticipantDialog(true)} variant="outline" className="bg-white/5 border-blue-400/30 text-blue-200 hover:bg-white/10">
                            <Users className="h-4 w-4 mr-2" />
                            Select Participants ({newExpense.participantIds.length})
                          </Button>
                          <Dialog open={showParticipantDialog} onOpenChange={setShowParticipantDialog}>
                                <DialogContent className="bg-slate-900 border-blue-600 text-white">
                                    <DialogHeader><DialogTitle>Select Participants</DialogTitle></DialogHeader>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {friends.map(friend => (
                                            <div key={friend.id} onClick={() => toggleParticipant(friend.id)} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${friend.id === currentUser.id ? 'bg-blue-600/30 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}>
                                                <Checkbox checked={newExpense.participantIds.includes(friend.id)} disabled={friend.id === currentUser.id} />
                                                <span>{friend.username}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Button onClick={() => setShowParticipantDialog(false)} className="mt-4">Done</Button>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-700/20 rounded-lg border border-blue-400/20">
                          <Checkbox 
                            checked={newExpense.payFromWallet} 
                            onCheckedChange={(checked) => setNewExpense({...newExpense, payFromWallet: checked as boolean})}
                            id="payFromWallet"
                          />
                          <label htmlFor="payFromWallet" className="text-slate-200 cursor-pointer text-sm flex-1">
                            Pay from wallet (if I am the payer)
                          </label>
                        </div>
                        <Button onClick={addExpenseHandler} disabled={!newExpense.description || !newExpense.amount} className="w-full bg-gradient-to-r from-blue-600 to-blue-800">Add Expense</Button>
                    </CardContent>
                </Card>

                {/* Expenses Table */}
                <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
                    <CardHeader><CardTitle className="text-white">Expenses</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-blue-400/20">
                                    <TableHead className="text-blue-200">Description</TableHead>
                                    <TableHead className="text-blue-200">Amount</TableHead>
                                    <TableHead className="text-blue-200">Paid By</TableHead>
                                    <TableHead className="text-blue-200">Split Among</TableHead>
                                    <TableHead className="text-blue-200">Category</TableHead>
                                    <TableHead className="text-blue-200">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExpenses.map(expense => {
                                    const splitAmount = expense.amount / expense.splits.length;
                                    const categoryName = budgetCategories.find(bc => bc.id.toString() === (expense as any).budgetCategory)?.name || '-';
                                    const categoryIcon = budgetCategories.find(bc => bc.id.toString() === (expense as any).budgetCategory)?.icon || '';
                                    return (
                                    <TableRow key={expense.id} className="border-blue-400/10">
                                        <TableCell className="text-white">{expense.description}</TableCell>
                                        <TableCell className="text-white">₹{expense.amount.toFixed(2)}</TableCell>
                                        <TableCell className="text-white">{getUsername(expense.paid_by)}</TableCell>
                                        <TableCell className="text-blue-200 text-sm">{expense.splits.length} people • ₹{splitAmount.toFixed(2)} each</TableCell>
                                        <TableCell className="text-blue-200 text-sm">{categoryIcon} {categoryName}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => removeExpenseHandler(expense.id)} className="text-red-400 hover:text-red-300">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Balance Summary */}
                <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
                    <CardHeader><CardTitle className="text-white">Settlement Summary</CardTitle></CardHeader>
                    <CardContent>
                        {Object.entries(balances).map(([id, balance]) => {
                            if (balance === 0) return null;
                            return (
                                <div key={id} className="flex justify-between items-center p-4 rounded-lg bg-white/5 border border-blue-400/10 mb-2">
                                    <span className="text-white">{getUsername(Number(id))}</span>
                                  <span className={balance > 0 ? 'text-green-400' : 'text-red-400'}>
                                    {balance > 0 ? `Gets back ₹${balance.toFixed(2)}` : `Owes ₹${Math.abs(balance).toFixed(2)}`}
                                  </span>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

            </TabsContent>

            <TabsContent value="groups" className="space-y-6 mt-6">
                {/* Create Group Form */}
                <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
                     <CardHeader><CardTitle className="text-white">Create New Group</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                        <Input placeholder="Group Name" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} className="bg-white/5 border-blue-400/30 text-white" />
                        <Button onClick={() => setShowGroupDialog(true)} variant="outline" className="bg-white/5 border-blue-400/30 text-blue-200 hover:bg-white/10">
                            <Users className="h-4 w-4 mr-2" />
                            Select Members ({newGroup.memberIds.length})
                        </Button>
                        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
                            <DialogContent className="bg-slate-900 border-blue-600 text-white">
                                <DialogHeader><DialogTitle>Select Members</DialogTitle></DialogHeader>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {friends.map(friend => (
                                        <div key={friend.id} onClick={() => toggleGroupMember(friend.id)} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${friend.id === currentUser.id ? 'bg-blue-600/30 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}>
                                            <Checkbox checked={newGroup.memberIds.includes(friend.id)} disabled={friend.id === currentUser.id}/>
                                            <span>{friend.username}</span>
                                        </div>
                                    ))}
                                </div>
                                 <Button onClick={() => setShowGroupDialog(false)} className="mt-4">Done</Button>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={createGroupHandler} disabled={!newGroup.name || newGroup.memberIds.length < 2} className="w-full bg-gradient-to-r from-blue-600 to-blue-800">Create Group</Button>
                     </CardContent>
                </Card>

                {/* Groups List */}
                <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
                    <CardHeader><CardTitle className="text-white">Your Groups</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {groups.map(group => (
                            <div key={group.id} className="p-4 rounded-lg bg-white/5 border border-blue-400/10">
                                <div className="flex justify-between items-center">
                                  <h3 className="text-white text-lg">{group.name}</h3>
                                  <Button variant="ghost" size="sm" onClick={() => removeGroup(group.id)} className="text-red-400 hover:text-red-300">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-blue-200 text-sm">{group.members.length} members</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {group.members.map(member => (
                                        <span key={member} className="px-2 py-1 bg-blue-600/20 rounded text-blue-200 text-xs">{member}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
