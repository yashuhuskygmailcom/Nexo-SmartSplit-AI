import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { ArrowLeft, Send, Bot, User, Sparkles } from 'lucide-react';

interface ChatBotProps {
  onBack: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    type: 'bot',
    content: "Hi! I'm your Nexo AI assistant. I can help you with expense tracking, splitting bills, managing friends, budgeting, and answering questions about your finances. How can I help you today?",
    timestamp: new Date()
  }
];

// Intelligent response generator based on user query
const generateResponse = (userQuery: string): string => {
  const query = userQuery.toLowerCase();
  
  // Expense splitting queries
  if (query.includes('split') && (query.includes('bill') || query.includes('expense'))) {
    return "To split a bill, go to the Expense Splitter feature. You can:\n\n1. Create a group or select friends\n2. Add the expense amount and description\n3. Choose who paid for it\n4. Select participants to split among\n\nThe app will automatically calculate how much each person owes. Would you like me to guide you through the process?";
  }
  
  if (query.includes('split') && query.includes('how')) {
    return "Nexo makes bill splitting easy! Here's how:\n\n• Select the Expense Splitter from the dashboard\n• Choose a group or custom select friends\n• Add expense details (amount, description)\n• The app splits evenly among selected participants\n• View who owes what in the Settlement Summary\n\nYou can also create groups for recurring expenses like trips or office lunches!";
  }
  
  // Group management queries
  if (query.includes('group') && (query.includes('create') || query.includes('make') || query.includes('new'))) {
    return "To create a group:\n\n1. Go to Expense Splitter → Groups tab\n2. Click 'Create New Group'\n3. Enter a group name (e.g., 'Weekend Trip', 'Office Lunch')\n4. Select members from your friends list\n5. Click 'Create Group'\n\nOnce created, you can add expenses specifically to that group, and all calculations will be done within those members automatically!";
  }
  
  if (query.includes('group')) {
    return "Groups help you organize expenses for specific events or recurring activities. You can:\n\n• Create groups with custom members\n• Add expenses to specific groups\n• View group-specific balances\n• Track total spending per group\n\nFor example, create a 'Roommates' group for shared household expenses, or 'Road Trip 2024' for vacation costs!";
  }
  
  // Balance and settlement queries
  if (query.includes('owe') || query.includes('balance') || query.includes('settle')) {
    return "Based on your expenses, here's what I can help you with:\n\n• View your current balances in the Expense Splitter\n• See who owes you money (shown in green)\n• Check what you owe others (shown in red)\n• Filter by specific groups\n\nThe Settlement Summary shows all balances automatically calculated. You can also set up Payment Reminders to notify friends about pending payments!";
  }
  
  if (query.includes('who owes') || query.includes('owes me')) {
    return "To check who owes you money:\n\n1. Go to Expense Splitter\n2. View the Settlement Summary section\n3. Green amounts = money you'll receive\n4. Red amounts = money you owe\n\nYou can filter by specific groups to see group-specific balances. The app calculates everything automatically based on who paid and who participated in each expense!";
  }
  
  // Friend management queries
  if (query.includes('add friend') || query.includes('invite friend')) {
    return "To add friends to Nexo:\n\n1. Navigate to the Friends List from the dashboard\n2. Click on the 'Add Friend' section\n3. Enter your friend's email address\n4. Click 'Add'\n\nOnce added, you can include them in expense splits, create groups with them, and track shared expenses together!";
  }
  
  if (query.includes('friend')) {
    return "The Friends List helps you manage your expense-sharing contacts. You can:\n\n• Add new friends by email\n• View individual balances with each friend\n• See who owes you and who you owe\n• Message friends about expenses\n• Create groups with multiple friends\n\nAll your expense calculations automatically include your friends list!";
  }
  
  // Budget tracking queries
  if (query.includes('budget')) {
    return "Budget Boss helps you manage your spending! You can:\n\n• Set monthly budget limits by category\n• Track spending vs. budget in real-time\n• Get alerts when approaching limits\n• View visual progress bars\n• Analyze spending patterns\n\nAccess Budget Boss from the dashboard to set up your first budget category!";
  }
  
  // OCR Scanner queries
  if (query.includes('scan') || query.includes('receipt') || query.includes('ocr')) {
    return "The OCR Scanner feature lets you digitize receipts instantly:\n\n1. Click on OCR Scanner from the dashboard\n2. Upload a receipt image or take a photo\n3. The AI extracts expense details automatically\n4. Review and edit the detected information\n5. Add it as an expense\n\nThis saves time and ensures accurate expense tracking. You can even split scanned receipts among friends!";
  }
  
  // Payment reminder queries
  if (query.includes('remind') || query.includes('notification')) {
    return "Payment Reminders help you collect money from friends:\n\n• Set up automatic reminders for pending payments\n• Choose reminder frequency (daily, weekly, etc.)\n• Send friendly payment requests\n• Track payment status\n\nAccess Payment Reminders from the dashboard to manage all your pending settlements!";
  }
  
  // Badges and gamification queries
  if (query.includes('badge') || query.includes('leaderboard') || query.includes('achievement')) {
    return "Nexo gamifies expense tracking with badges and leaderboards!\n\n🏆 Earn badges for:\n• Adding expenses regularly\n• Settling debts promptly\n• Helping friends split bills\n• Reaching savings goals\n\nCompete with friends on the leaderboard and unlock achievements. Check the Badges & Leaderboard section from your dashboard!";
  }
  
  // Expense summary queries
  if (query.includes('summary') || query.includes('total') || query.includes('spending')) {
    return "Your expense summary shows:\n\n• Total expenses this month\n• Spending breakdown by category\n• Comparison with previous months\n• Active groups and their totals\n• Outstanding balances\n\nView detailed graphs and charts on your dashboard, or use Budget Boss for category-specific insights!";
  }
  
  // Monthly/weekly reports
  if (query.includes('month') || query.includes('report')) {
    return "Monthly reports help you track your financial health:\n\n• View total monthly expenses\n• See spending trends and patterns\n• Compare month-over-month changes\n• Identify your biggest expense categories\n• Track group spending over time\n\nThe dashboard shows your current month's spending graph. Budget Boss provides detailed category breakdowns!";
  }
  
  // How to use queries
  if (query.includes('how to') || query.includes('how do i')) {
    return "I can help you with:\n\n💰 Expense Splitter - Split bills with friends\n👥 Groups - Organize expenses by event/group\n📸 OCR Scanner - Scan receipts automatically\n👫 Friends - Manage your contacts\n📊 Budget Boss - Track spending vs budget\n🔔 Payment Reminders - Get paid faster\n🏆 Badges - Earn achievements\n\nWhat would you like to learn more about? Just ask me specific questions!";
  }
  
  // Profile queries
  if (query.includes('profile') || query.includes('account')) {
    return "Your profile settings let you:\n\n• Update personal information\n• Set notification preferences\n• Manage payment methods\n• View account statistics\n• Export expense data\n\nAccess your profile from the top-right menu on the dashboard!";
  }
  
  // Calculation queries
  if (query.includes('calculate') || query.includes('math')) {
    return "Nexo handles all expense calculations automatically:\n\n• Even splits among participants\n• Individual balances (who owes whom)\n• Group totals and subtotals\n• Category-wise spending\n• Monthly aggregations\n\nJust add your expenses and participants - the app does the math for you! View results in the Settlement Summary.";
  }
  
  // General help
  if (query.includes('help') || query.includes('what can you')) {
    return "I'm here to help you with all Nexo features:\n\n📱 Main Features:\n• Expense Splitter - Split bills fairly\n• Group Management - Organize by event\n• OCR Scanner - Digitize receipts\n• Budget Boss - Track spending limits\n• Payment Reminders - Collect debts\n• Badges & Leaderboard - Gamification\n\n💡 I can answer questions about:\n• How to split expenses\n• Creating and managing groups\n• Tracking balances\n• Adding friends\n• Setting budgets\n• And much more!\n\nWhat would you like to know?";
  }
  
  // Greeting responses
  if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    return "Hello! 👋 How can I assist you with your expenses today? I can help you split bills, manage groups, track budgets, or answer any questions about Nexo's features!";
  }
  
  if (query.includes('thank') || query.includes('thanks')) {
    return "You're welcome! 😊 I'm always here to help. If you have any more questions about expense tracking, splitting bills, or any Nexo features, feel free to ask!";
  }
  
  // Default response for unrecognized queries
  return "I'm not sure I understood that completely. I can help you with:\n\n• Splitting expenses and bills\n• Creating and managing groups\n• Tracking who owes what\n• Adding and managing friends\n• Setting up budgets (Budget Boss)\n• Scanning receipts (OCR)\n• Payment reminders\n• Earning badges and achievements\n\nCould you rephrase your question, or ask about any of these features?";
};

export function ChatBot({ onBack }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const scrollContainer = document.querySelector('[data-slot="scroll-area-viewport"]');
    if (scrollContainer) {
      setTimeout(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = newMessage;
    setNewMessage('');
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const intelligentResponse = generateResponse(currentQuery);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: intelligentResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    "How do I split a bill?",
    "How much do I owe friends?",
    "Create a new group",
    "How to scan receipts?",
    "Set up a budget"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            className="bg-white/5 hover:bg-white/10 border-blue-400/30 text-white backdrop-blur-sm"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-400/30">
              <Sparkles className="h-6 w-6 text-blue-300" />
            </div>
            <h1 className="text-3xl bg-gradient-to-r from-blue-300 via-blue-200 to-slate-200 bg-clip-text text-transparent">
              AI Assistant
            </h1>
          </div>
        </div>

        {/* Chat Interface */}
        <Card className="bg-white/5 backdrop-blur-md border-blue-400/20 h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0 border-b border-blue-400/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-300" />
              Nexo AI Assistant
              <span className="ml-auto text-xs text-blue-300 bg-blue-600/20 px-2 py-1 rounded-full">Online</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] ${
                        message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                          message.type === 'user'
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-400/30'
                            : 'bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-400/30'
                        }`}
                      >
                        {message.type === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div
                          className={`p-3 rounded-2xl ${
                            message.type === 'user'
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                              : 'bg-white/5 text-white border border-blue-400/20'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                        <p
                          className={`text-xs px-2 ${
                            message.type === 'user' ? 'text-right text-blue-300' : 'text-blue-300'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-400/30 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-blue-400/20">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="px-6 py-3 border-t border-blue-400/20 bg-white/5">
              <p className="text-blue-300 text-xs mb-2">Quick Actions:</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={() => {
                      setNewMessage(action);
                      // Use setTimeout to ensure state is updated before sending
                      setTimeout(() => {
                        const userMessage: Message = {
                          id: Date.now().toString(),
                          type: 'user',
                          content: action,
                          timestamp: new Date()
                        };
                        setMessages(prev => [...prev, userMessage]);
                        setNewMessage('');
                        setIsTyping(true);

                        setTimeout(() => {
                          const intelligentResponse = generateResponse(action);
                          const botMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            type: 'bot',
                            content: intelligentResponse,
                            timestamp: new Date()
                          };
                          setMessages(prev => [...prev, botMessage]);
                          setIsTyping(false);
                        }, 1000);
                      }, 0);
                    }}
                    disabled={isTyping}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/10 border-blue-400/30 text-blue-200 hover:text-white whitespace-nowrap text-xs disabled:opacity-50"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="px-6 pb-6 pt-3">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about expenses, splitting bills, groups..."
                  className="bg-white/5 border-blue-400/30 text-white placeholder:text-blue-300/50 focus:border-blue-400 focus:ring-blue-400/20"
                  disabled={isTyping}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isTyping}
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Info */}
        <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
          <CardHeader>
            <CardTitle className="text-white">What I Can Help With</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="text-blue-200">💰 Expense Management</h4>
                <ul className="text-blue-300/70 text-sm space-y-1">
                  <li>• Split bills with friends</li>
                  <li>• Track group expenses</li>
                  <li>• Calculate settlements</li>
                  <li>• Scan receipts (OCR)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-blue-200">📊 Financial Insights</h4>
                <ul className="text-blue-300/70 text-sm space-y-1">
                  <li>• Budget tracking (Budget Boss)</li>
                  <li>• Spending analysis</li>
                  <li>• Monthly summaries</li>
                  <li>• Category breakdowns</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-blue-200">🎯 Smart Features</h4>
                <ul className="text-blue-300/70 text-sm space-y-1">
                  <li>• Payment reminders</li>
                  <li>• Group management</li>
                  <li>• Badges & leaderboard</li>
                  <li>• Friends management</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
