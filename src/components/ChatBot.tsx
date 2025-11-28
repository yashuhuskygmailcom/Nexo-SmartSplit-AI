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
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Nexo AI Assistant</span>
              <Sparkles className="h-4 w-4 text-purple-300" />
            </div>
            <p className="text-xs text-slate-400">
              Ask about your balances, groups, OCR and more
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
        {/* Chat area */}
        <Card className="flex-1 bg-slate-900/60 border-slate-800 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">
              Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-0">
            <ScrollArea className="flex-1 pr-2">
              <div className="flex flex-col gap-3 py-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                        msg.type === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-slate-800/80 text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-xs opacity-75">
                        {msg.type === 'user' ? (
                          <>
                            <span>You</span>
                            <User className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3" />
                            <span>Nexo AI</span>
                          </>
                        )}
                      </div>
                      <div>{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 flex items-center gap-2">
              <Input
                placeholder="Ask me something about your expenses..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-slate-900/80 border-slate-700 text-slate-100"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Helper panel */}
        <Card className="w-full md:w-80 bg-slate-900/70 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">
              What I can help with
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="font-semibold mb-1">💰 Expense Management</p>
              <ul className="text-slate-400 space-y-1">
                <li>• Split bills with friends</li>
                <li>• Track group expenses</li>
                <li>• Calculate settlements</li>
                <li>• Scan receipts (OCR)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">📊 Financial Insights</p>
              <ul className="text-slate-400 space-y-1">
                <li>• Who owes whom how much</li>
                <li>• Monthly spending overview</li>
                <li>• Per-friend balances</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">🎯 Smart Features</p>
              <ul className="text-slate-400 space-y-1">
                <li>• Payment reminders</li>
                <li>• Group management</li>
                <li>• Badges & leaderboard</li>
                <li>• Friends management</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBot;
