import {Page} from '../App';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Search, 
  Calculator, 
  Scan, 
  Users, 
  MessageCircle, 
  User,
  TrendingUp,
  DollarSign,
  Receipt,
  Bell,
  Trophy,
  Target
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


interface DashboardProps {
 onNavigate: (page: Page) => void;

}

const mockSpendingData = [
  { name: 'Week 1', amount: 120 },
  { name: 'Week 2', amount: 350 },
  { name: 'Week 3', amount: 280 },
  { name: 'Week 4', amount: 190 },
];

const mockFriends = [
  { id: 1, name: 'Alice Johnson', avatar: '👩', balance: -25.50 },
  { id: 2, name: 'Bob Smith', avatar: '👨', balance: 18.75 },
  { id: 3, name: 'Carol Davis', avatar: '👩‍🦱', balance: -12.00 },
  { id: 4, name: 'David Wilson', avatar: '👨‍🦲', balance: 35.25 },
];

const mockExpenses = [
  { id: 1, name: 'Restaurant dinner', category: 'Food', friend: 'Alice Johnson' },
  { id: 2, name: 'Movie tickets', category: 'Entertainment', friend: 'Bob Smith' },
  { id: 3, name: 'Grocery shopping', category: 'Food', friend: 'Carol Davis' },
  { id: 4, name: 'Gas station', category: 'Transport', friend: 'David Wilson' },
];

export function Dashboard({ onNavigate }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const totalSpent = mockSpendingData.reduce((sum, data) => sum + data.amount, 0);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    // Search through friends
    const matchedFriends = mockFriends.filter(friend => 
      friend.name.toLowerCase().includes(lowerQuery)
    ).map(friend => ({ ...friend, type: 'friend' }));

    // Search through expenses
    const matchedExpenses = mockExpenses.filter(expense => 
      expense.name.toLowerCase().includes(lowerQuery) || 
      expense.category.toLowerCase().includes(lowerQuery)
    ).map(expense => ({ ...expense, type: 'expense' }));

    const results = [...matchedFriends, ...matchedExpenses];
    setFilteredResults(results);
    setShowSearchResults(results.length > 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-5xl bg-gradient-to-r from-slate-200 to-blue-200 bg-clip-text text-transparent font-light tracking-wider mb-6">
            NEXO
          </h1>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 z-10" />
            <Input
              placeholder="Search expenses, friends..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 h-12 bg-slate-800/40 backdrop-blur-xl border-slate-600/30 text-slate-200 placeholder:text-slate-400 rounded-2xl"
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full mt-2 w-full bg-slate-800/95 backdrop-blur-xl border border-slate-600/30 rounded-2xl shadow-2xl z-20 max-h-96 overflow-y-auto">
                <div className="p-4 space-y-2">
                  <p className="text-slate-400 text-sm mb-3">Search Results ({filteredResults.length})</p>
                  {filteredResults.map((result, index) => (
                    <div 
                      key={`${result.type}-${result.id}`}
                      className="p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 cursor-pointer transition-all"
                      onClick={() => {
                        if (result.type === 'friend') {
                          onNavigate('friends');
                        } else {
                          onNavigate('splitter');
                        }
                        setShowSearchResults(false);
                        setSearchQuery('');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.type === 'friend' ? (
                            <>
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                                {result.avatar}
                              </div>
                              <div>
                                <p className="text-slate-200">{result.name}</p>
                                <p className="text-slate-400 text-xs">Friend</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                                <Receipt className="h-4 w-4 text-purple-300" />
                              </div>
                              <div>
                                <p className="text-slate-200">{result.name}</p>
                                <p className="text-slate-400 text-xs">{result.category} • {result.friend}</p>
                              </div>
                            </>
                          )}
                        </div>
                        {result.type === 'friend' && (
                          <span className={`text-sm ${result.balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            ${Math.abs(result.balance).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-light">This Month</p>
                  <p className="text-3xl text-slate-200 font-light">${totalSpent}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-2xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-light">You Owe</p>
                  <p className="text-3xl text-red-300 font-light">$37.50</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-slate-500/20 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-red-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-light">You're Owed</p>
                  <p className="text-3xl text-green-300 font-light">$54.00</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-slate-500/20 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spending Chart */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-200 font-light tracking-wide">Monthly Spending Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={mockSpendingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    color: '#E2E8F0',
                    fontSize: '14px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#60A5FA" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#60A5FA', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* New Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Button
            onClick={() => onNavigate('reminders')}
            className="h-20 bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl justify-start border backdrop-blur-xl transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-slate-500/20 rounded-xl flex items-center justify-center">
                <Bell className="h-6 w-6 text-orange-300" />
              </div>
              <div className="text-left">
                <p className="font-medium">Payment Reminders</p>
                <p className="text-slate-400 text-sm">3 pending</p>
              </div>
            </div>
          </Button>
          
          <Button
            onClick={() => onNavigate('badges')}
            className="h-20 bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl justify-start border backdrop-blur-xl transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-slate-500/20 rounded-xl flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-300" />
              </div>
              <div className="text-left">
                <p className="font-medium">Badges & Leaderboard</p>
                <p className="text-slate-400 text-sm">Rank #1</p>
              </div>
            </div>
          </Button>
          
          <Button
            onClick={() => onNavigate('budget')}
            className="h-20 bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl justify-start border backdrop-blur-xl transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-slate-500/20 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-green-300" />
              </div>
              <div className="text-left">
                <p className="font-medium">Budget Boss</p>
                <p className="text-slate-400 text-sm">75% used</p>
              </div>
            </div>
          </Button>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Button
            onClick={() => onNavigate('splitter')}
            className="h-28 bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl flex flex-col items-center gap-3 border backdrop-blur-xl transition-all duration-300"
            variant="outline"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-xl flex items-center justify-center">
              <Calculator className="h-5 w-5 text-blue-300" />
            </div>
            <span className="font-light">Splitter</span>
          </Button>
          
          <Button
            onClick={() => onNavigate('friends')}
            className="h-28 bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl flex flex-col items-center gap-3 border backdrop-blur-xl transition-all duration-300"
            variant="outline"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-slate-500/20 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-300" />
            </div>
            <span className="font-light">Friends</span>
          </Button>
          
          <Button
            onClick={() => onNavigate('scanner')}
            className="h-28 bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl flex flex-col items-center gap-3 border backdrop-blur-xl transition-all duration-300"
            variant="outline"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-slate-500/20 rounded-xl flex items-center justify-center">
              <Scan className="h-5 w-5 text-cyan-300" />
            </div>
            <span className="font-light">OCR Scanner</span>
          </Button>
          
          <Button
            onClick={() => onNavigate('chatbot')}
            className="h-28 bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl flex flex-col items-center gap-3 border backdrop-blur-xl transition-all duration-300"
            variant="outline"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-slate-500/20 rounded-xl flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-emerald-300" />
            </div>
            <span className="font-light">AI Assistant</span>
          </Button>
        </div>

        {/* Friends List */}
        <Card className="bg-slate-800/40 backdrop-blur-xl border-slate-600/30 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-200 font-light tracking-wide">Recent Friends</CardTitle>
            <Button 
              variant="ghost" 
              onClick={() => onNavigate('friends')}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-xl"
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockFriends.slice(0, 3).map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-slate-500/20 rounded-xl flex items-center justify-center text-lg">
                      {friend.avatar}
                    </div>
                    <span className="text-slate-200 font-medium">{friend.name}</span>
                  </div>
                  <span className={`font-medium ${friend.balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    ${Math.abs(friend.balance).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Navigation */}
        <div className="flex justify-center pb-8">
          <Button
            onClick={() => onNavigate('profile')}
            className="bg-slate-800/40 hover:bg-slate-700/50 border-slate-600/30 text-slate-200 rounded-2xl px-8 py-3 backdrop-blur-xl"
            variant="outline"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
