import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Sender, AvatarMood, UserProfile } from '../types';
import { sendMessageStream, resetSession } from '../services/geminiService';

interface ChatInterfaceProps {
  onMoodChange: (mood: AvatarMood) => void;
  userProfile: UserProfile;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onMoodChange, userProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevSubjectRef = useRef(userProfile.focusSubject);
  const hasInitialized = useRef(false);

  // Initialize personalized welcome message
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    setMessages([
        {
          id: 'welcome',
          sender: Sender.AXIOM,
          text: `Hi ${userProfile.name}! 👋 I'm ready to help you crush Grade ${userProfile.grade} ${userProfile.focusSubject}. What are we working on?`,
          timestamp: new Date()
        }
    ]);
  }, []); // Only run once on mount

  // Watch for subject changes
  useEffect(() => {
    if (prevSubjectRef.current !== userProfile.focusSubject) {
        // Subject changed!
        resetSession(); // Clear Gemini context
        
        // Add visual divider/system message
        const switchMsg: ChatMessage = {
            id: `switch-${Date.now()}`,
            sender: Sender.SYSTEM,
            text: `Switched context to ${userProfile.focusSubject}`,
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, switchMsg]);
        prevSubjectRef.current = userProfile.focusSubject;
    }
  }, [userProfile.focusSubject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    onMoodChange(AvatarMood.THINKING);

    try {
      const responseId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: responseId,
        sender: Sender.AXIOM,
        text: '',
        timestamp: new Date()
      }]);

      let fullRawText = "";
      let moodDetected = false;

      // Pass userProfile to ensure session is initialized with context if needed
      for await (const chunk of sendMessageStream(userMsg.text, userProfile)) {
        fullRawText += chunk;
        
        // --- MOOD DETECTION ENGINE ---
        if (!moodDetected) {
            if (fullRawText.includes('<MOOD:SUCCESS>')) {
                onMoodChange(AvatarMood.SUCCESS);
                moodDetected = true;
                setTimeout(() => onMoodChange(AvatarMood.IDLE), 4000); // Celebration lasts 4s
            } else if (fullRawText.includes('<MOOD:SAD>')) {
                onMoodChange(AvatarMood.SAD);
                moodDetected = true;
                setTimeout(() => onMoodChange(AvatarMood.IDLE), 4000);
            } else if (fullRawText.includes('<MOOD:ALMOST>')) {
                onMoodChange(AvatarMood.ALMOST);
                moodDetected = true;
                setTimeout(() => onMoodChange(AvatarMood.IDLE), 4000);
            }
        }

        // Clean text for display (remove tags)
        const cleanText = fullRawText
            .replace('<MOOD:SUCCESS>', '')
            .replace('<MOOD:SAD>', '')
            .replace('<MOOD:ALMOST>', '');

        setMessages(prev => prev.map(msg => 
          msg.id === responseId ? { ...msg, text: cleanText } : msg
        ));
      }
      
      if (!moodDetected) {
         onMoodChange(AvatarMood.IDLE);
      }

    } catch (error) {
      console.error(error);
      onMoodChange(AvatarMood.CONFUSED);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-2 border-gray-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-100 bg-white flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            Chat with Axiom 
            <span className="bg-[#e5f6ff] text-[#1cb0f6] text-xs px-2 py-1 rounded-lg">
                {userProfile.focusSubject}
            </span>
        </h2>
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => {
            if (msg.sender === Sender.SYSTEM) {
                return (
                    <div key={msg.id} className="flex justify-center my-4 opacity-50">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            {msg.text}
                        </span>
                    </div>
                );
            }
            return (
                <div
                    key={msg.id}
                    className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                    className={`max-w-[80%] px-5 py-3 text-lg font-bold rounded-2xl border-2 border-b-4 ${
                        msg.sender === Sender.USER
                        ? 'bg-[#1cb0f6] border-[#1499d6] text-white rounded-br-sm'
                        : 'bg-white border-gray-200 text-gray-600 rounded-bl-sm'
                    }`}
                    >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                </div>
            );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-bl-sm border-2 border-transparent">
              <span className="animate-bounce inline-block mx-1">●</span>
              <span className="animate-bounce inline-block mx-1 delay-100">●</span>
              <span className="animate-bounce inline-block mx-1 delay-200">●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t-2 border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${userProfile.focusSubject}...`}
            className="flex-1 bg-gray-100 border-2 border-gray-200 text-gray-700 px-4 py-3 rounded-2xl focus:outline-none focus:bg-white focus:border-[#1cb0f6] transition-colors placeholder-gray-400 font-bold"
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className="btn-push bg-[#58cc02] border-[#46a302] border-b-4 hover:bg-[#61e002] active:border-b-0 text-white font-extrabold px-8 py-3 rounded-2xl uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;