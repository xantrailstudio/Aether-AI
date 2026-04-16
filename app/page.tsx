'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  History, 
  Search,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  User,
  Bot,
  MoreVertical
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ai, DEFAULT_MODEL } from '@/lib/gemini';
import { useChatHistory, Message } from '@/hooks/use-chat-history';

export default function ChatPage() {
  const {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    updateSession,
    deleteSession,
  } = useChatHistory();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isLoading]);

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let session = currentSession;
    if (!session) {
      session = createNewSession();
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, userMessage];
    updateSession(session.id, updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for context
      const contents = updatedMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: contents,
        config: {
          systemInstruction: "You are Aether AI, a sophisticated and helpful AI assistant. You remember past conversations to provide better context. Your tone is professional yet approachable. Use markdown for formatting. If the user asks about past conversations, use the provided history to answer.",
        },
      });

      const aiMessage: Message = {
        role: 'model',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now(),
      };

      // Update title if it's the first message
      let newTitle = session.title;
      if (session.messages.length === 0) {
        newTitle = userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : '');
      }

      updateSession(session.id, [...updatedMessages, aiMessage], newTitle);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'model',
        content: "Error: Failed to connect to the AI. Please check your API key and try again.",
        timestamp: Date.now(),
      };
      updateSession(session.id, [...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-full bg-bg-deep text-text-primary overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="bg-bg-sidebar border-r border-border-custom flex flex-col overflow-hidden relative shrink-0"
      >
        <div className="p-6 flex items-center gap-3 border-b border-border-custom">
          <div className="w-8 h-8 bg-linear-to-br from-accent to-[#b388ff] rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Aether AI</span>
        </div>

        <div className="p-4">
          <button 
            onClick={createNewSession}
            className="w-full py-2.5 px-4 bg-accent hover:bg-accent/90 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-lg shadow-accent/20"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
            <input 
              type="text" 
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-deep border border-border-custom rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          <div>
            <span className="text-[11px] uppercase text-text-dim tracking-widest mb-3 block px-2">Recent Saved Chats</span>
            <div className="space-y-1">
              {filteredSessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`group p-3 rounded-lg cursor-pointer flex flex-col gap-1 sidebar-item ${
                    currentSessionId === session.id 
                      ? 'bg-bg-card border border-border-custom shadow-md' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">{session.title}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-text-dim flex items-center gap-1.5">
                    <History className="w-3 h-3" />
                    {new Date(session.lastUpdated).toLocaleDateString()} • {session.messages.length} msgs
                  </span>
                </div>
              ))}
              {filteredSessions.length === 0 && (
                <div className="px-2 py-4 text-sm text-text-dim italic">
                  {searchQuery ? 'No matching chats found.' : 'No saved chats yet.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border-custom bg-bg-sidebar">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-card transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-border-custom flex items-center justify-center">
              <User className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium">Guest User</span>
              <span className="text-[10px] text-text-dim">Local Storage Active</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-bg-deep relative">
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-bg-card border border-border-custom rounded-full text-text-dim hover:text-text-primary transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <header className="h-20 px-10 flex items-center justify-between border-b border-border-custom glass-effect z-10 shrink-0">
          <div className="flex flex-col">
            <span className="text-base font-semibold truncate max-w-[300px]">
              {currentSession?.title || 'Aether Core'}
            </span>
            <div className="flex items-center gap-2 text-xs text-accent">
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              Contextual Memory Active
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-text-dim hover:text-text-primary transition-colors">
              <Bookmark className="w-5 h-5" />
            </button>
            <button className="p-2 text-text-dim hover:text-text-primary transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-6 md:px-24 py-10 space-y-8 scroll-smooth">
          <AnimatePresence initial={false}>
            {currentSession?.messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-border-custom' : 'bg-accent-muted'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className={`p-4 px-5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-accent text-white rounded-tr-none' 
                    : 'bg-bg-card border border-border-custom text-text-primary rounded-tl-none'
                }`}>
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 max-w-[85%]"
            >
              <div className="w-9 h-9 rounded-full bg-accent-muted flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="p-4 px-5 bg-bg-card border border-border-custom rounded-2xl rounded-tl-none flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
          
          {!currentSession && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-16 h-16 bg-bg-card border border-border-custom rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">How can I assist you today?</h1>
                <p className="text-text-secondary max-w-md mx-auto text-sm leading-relaxed">
                  I&apos;m Aether, your contextual AI assistant. I remember our past conversations to provide more relevant and personalized help.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                {[
                  "Explain quantum computing",
                  "Write a React hook for API calls",
                  "Review my architecture plan",
                  "Help me with a grocery list"
                ].map((suggestion) => (
                  <button 
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="p-4 text-left text-sm rounded-xl bg-bg-card border border-border-custom hover:border-accent hover:bg-white/5 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>

        <footer className="px-6 md:px-24 pb-10 pt-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-accent to-[#b388ff] rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
              <div className="relative glass-effect rounded-xl p-3 flex items-center gap-3 shadow-2xl focus-within:border-accent transition-all">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about past conversations or start a new topic..."
                  className="flex-1 bg-transparent border-none text-text-primary text-[15px] outline-none px-2"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    input.trim() && !isLoading 
                      ? 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20' 
                      : 'bg-white/5 text-text-dim cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-text-dim text-center tracking-wide">
              Press Enter to send • ⌘ + K to search history
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
