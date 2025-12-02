// src/components/ChatBot.tsx
import React, { useState, KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { ArrowLeft, Send, Bot, User, Sparkles } from 'lucide-react';
import { getExpenseSummary } from '../api';

type ChatBotProps = {
  onBack: () => void;
};

type Message = {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
};

const initialBotMessage: Message = {
  id: 'welcome',
  type: 'bot',
  content:
    "Hi! I'm your Nexo AI assistant 🤖\n\nI can help you with:\n• Who owes whom how much\n• Understanding your balances\n• Explaining features like Expense Splitter, Groups, OCR, and Reminders\n\nAsk me things like:\n• \"How much do I owe friends?\"\n• \"How much do friends owe me?\"\n• \"What is the Expense Splitter?\"",
  timestamp: new Date(),
};

const ChatBot: React.FC<ChatBotProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([initialBotMessage]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const addMessage = (msg: Message) => {
    setMessages((prev: Message[]) => [...prev, msg]);
  };

  const handleBotResponse = async (userText: string) => {
    const query = userText.toLowerCase().trim();

    const containsAny = (words: string[]) =>
      words.some((w) => query.includes(w));

    setIsSending(true);
    try {
      // 1) "How much do I owe friends?"
      if (
        containsAny(['how much do i owe', 'what do i owe', 'owe friends']) ||
        (query.includes('owe') && query.includes('friends'))
      ) {
        const { data } = await getExpenseSummary();
        const totalOwed = Number(data.totalOwed ?? 0);

        const text =
          totalOwed > 0
            ? `You currently owe a total of ₹${totalOwed.toFixed(
                2,
              )} to your friends across all expenses in Nexo.\n\nYou can see a detailed breakdown in the *Expense Splitter* → *Settlements* section.`
            : `Great news! 🎉 Right now you don't owe anything to your friends in Nexo.`;

        addMessage({
          id: crypto.randomUUID(),
          type: 'bot',
          content: text,
          timestamp: new Date(),
        });
        return;
      }

      // 2) "How much do friends owe me?"
      if (
        containsAny(['owe me', 'friends owe me', 'how much do i get']) ||
        (query.includes('owe') && query.includes('me'))
      ) {
        const { data } = await getExpenseSummary();
        const totalPaid = Number(data.totalPaid ?? 0);
        const totalOwed = Number(data.totalOwed ?? 0);
        const friendsOweYou = Math.max(totalPaid - totalOwed, 0);

        const text =
          friendsOweYou > 0
            ? `Your friends currently owe you approximately ₹${friendsOweYou.toFixed(
                2,
              )} based on your shared expenses.\n\nYou can view who owes what in *Expense Splitter* → *Settlements*.`
            : `Right now your friends don't owe you anything in Nexo. ✅`;

        addMessage({
          id: crypto.randomUUID(),
          type: 'bot',
          content: text,
          timestamp: new Date(),
        });
        return;
      }

      // 3) Expense Splitter explanation
      if (
        containsAny(['expense splitter', 'splitter', 'split bill', 'split bills'])
      ) {
        const text =
          "The *Expense Splitter* helps you split shared costs fairly with friends:\n\n" +
          '1. Add an expense with description, amount, and who paid\n' +
          '2. Choose the friends or group to split with\n' +
          '3. Nexo automatically calculates who owes how much\n\n' +
          'You can also use Groups (like "Trip to Goa" or "Monthly Rent") to keep related expenses together.';
        addMessage({
          id: crypto.randomUUID(),
          type: 'bot',
          content: text,
          timestamp: new Date(),
        });
        return;
      }

      // 4) OCR explanation
      if (containsAny(['ocr', 'scan receipt', 'receipt'])) {
        const text =
          "The *Scan receipts (OCR)* feature lets you upload a bill or receipt photo and automatically extracts:\n\n" +
          '• Merchant name\n' +
          '• Date\n' +
          '• Approximate total amount\n\n' +
          'You can then convert that into an expense in the Splitter and share it with friends.';
        addMessage({
          id: crypto.randomUUID(),
          type: 'bot',
          content: text,
          timestamp: new Date(),
        });
        return;
      }

      // 5) Generic balance / settlement questions
      if (
        containsAny(['settle', 'settlement', 'balance', 'balances', 'who owes'])
      ) {
        const { data } = await getExpenseSummary();
        const totalPaid = Number(data.totalPaid ?? 0);
        const totalOwed = Number(data.totalOwed ?? 0);
        const net = totalPaid - totalOwed;

        let statusLine = '';
        if (net > 0) {
          statusLine = `Overall, your friends owe *you* about ₹${net.toFixed(
            2,
          )}.`;
        } else if (net < 0) {
          statusLine = `Overall, you owe your friends about ₹${Math.abs(
            net,
          ).toFixed(2)}.`;
        } else {
          statusLine = 'Overall, your balances are settled right now. 🎉';
        }

        const text =
          `${statusLine}\n\n` +
          'For detailed per-friend balances, open the *Expense Splitter* and check the Settlement Summary.';

        addMessage({
          id: crypto.randomUUID(),
          type: 'bot',
          content: text,
          timestamp: new Date(),
        });
        return;
      }

      // 6) Fallback – your previous generic help message
      const fallback =
        "Based on your expenses, here's what I can help you with:\n\n" +
        '• View your current balances in the Expense Splitter\n' +
        '• See who owes you money (shown in green)\n' +
        '• Check what you owe others (shown in red)\n' +
        '• Filter by specific groups\n\n' +
        'The Settlement Summary shows all balances automatically calculated. You can also set up Payment Reminders to notify friends about pending payments!';

      addMessage({
        id: crypto.randomUUID(),
        type: 'bot',
        content: fallback,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error(err);
      addMessage({
        id: crypto.randomUUID(),
        type: 'bot',
        content:
          'Sorry, I had trouble fetching your expense data. Please try again in a moment.',
        timestamp: new Date(),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    await handleBotResponse(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="bg-white/5 hover:bg-white/10 border-blue-400/30 text-white backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-400/30">
              <Bot className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl bg-gradient-to-r from-blue-300 via-blue-200 to-slate-200 bg-clip-text text-transparent">
                Nexo AI Assistant
              </h1>
              <p className="text-blue-300/70">Ask about your balances, groups, OCR and more</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 backdrop-blur-md border-blue-400/20 h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0 border-b border-blue-400/20">
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-300" />
                  Chat with Nexo AI
                  <span className="ml-auto text-xs text-blue-300 bg-blue-600/20 px-2 py-1 rounded-full">
                    Online
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 py-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`flex gap-3 max-w-[85%] ${
                            msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center">
                            {msg.type === 'user' ? (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-400/30 flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-400/30 flex items-center justify-center">
                                <Bot className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                          <div
                            className={`p-3 rounded-2xl ${
                              msg.type === 'user'
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                : 'bg-white/5 text-white border border-blue-400/20'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                        <div
                          className={`text-xs px-2 ${
                            msg.type === 'user' ? 'text-right' : 'text-left'
                          } text-blue-300/50`}
                        >
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-400/30 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-blue-400/20">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="px-6 py-3 border-t border-blue-400/20 bg-white/5">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Ask me something about your expenses..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-white/5 border-blue-400/30 text-white placeholder:text-blue-300/50 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isSending}
                      className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Helper Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-white/5 backdrop-blur-md border-blue-400/20">
              <CardHeader>
                <CardTitle className="text-white">What I can help with</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-blue-200">💰 Expense Management</h3>
                    <ul className="text-blue-300/70 text-sm space-y-1">
                      <li>• Split bills with friends</li>
                      <li>• Track group expenses</li>
                      <li>• Calculate settlements</li>
                      <li>• Scan receipts (OCR)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-blue-200">📊 Financial Insights</h3>
                    <ul className="text-blue-300/70 text-sm space-y-1">
                      <li>• Who owes whom how much</li>
                      <li>• Monthly spending overview</li>
                      <li>• Per-friend balances</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-blue-200">🎯 Smart Features</h3>
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
      </div>
    </div>
  );
};

export default ChatBot;
