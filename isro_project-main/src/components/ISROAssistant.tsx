import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Send } from 'lucide-react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ISROAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    // Greet on load
    const greet = () => {
      const greeting = "Hello, I'm your ISRO AI assistant. How can I help you today?";
      setMessages([{ sender: 'bot', text: greeting }]);
      speak(greeting);
    };
    greet();

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleUserQuery(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        addMessage('bot', "Sorry, I didn't catch that. Please try again.");
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      synthRef.current.speak(utterance);
    }
  };

  const addMessage = (sender: 'user' | 'bot', text: string) => {
    setMessages(prev => [...prev, { sender, text }]);
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleUserQuery = async (query: string) => {
    addMessage('user', query);
    try {
      const response = await fetchMosdacData(query);
      addMessage('bot', response);
      speak(response);
    } catch (error) {
      const errorMsg = "No data found for your query.";
      addMessage('bot', errorMsg);
      speak(errorMsg);
    }
  };

  const fetchMosdacData = async (query: string): Promise<string> => {
    // Placeholder: Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    if (query.toLowerCase().includes('weather')) {
      return "Fetching weather data... The current temperature in Mumbai is 28 degrees Celsius with clear sky.";
    } else if (query.toLowerCase().includes('satellite')) {
      return "MOSDAC provides satellite data. Please specify the dataset you're interested in.";
    } else {
      return "I'm here to help with ISRO and MOSDAC related queries. How can I assist you?";
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
      addMessage('bot', 'Listening...');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleUserQuery(userInput.trim());
      setUserInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-white/10">
          <h1 className="text-2xl font-bold text-white text-center">ISRO Assistant</h1>
          <p className="text-blue-200 text-center mt-1">Your AI voice companion for satellite intelligence</p>
        </div>

        {/* Chat Container */}
        <div
          ref={chatContainerRef}
          className="h-96 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white shadow-blue-500/50'
                    : 'bg-white/10 text-white border border-white/20 shadow-white/20'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/10 border-t border-white/10">
          <form onSubmit={handleTextSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              title={isListening ? "Stop listening" : "Start listening"}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50'
                  : 'bg-green-500 hover:bg-green-600 shadow-green-500/50'
              } shadow-lg`}
            >
              {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
            <button
              type="submit"
              title="Send message"
              className="p-3 bg-blue-500 hover:bg-blue-600 rounded-xl shadow-lg shadow-blue-500/50 transition-all"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ISROAssistant;
