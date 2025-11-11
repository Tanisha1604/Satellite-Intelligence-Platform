import React, { useState, useEffect, useRef } from 'react';
import ragService, { ChatMessage } from '../services/ragService';
import { Entity, Relationship } from '../services/nlpService';
import { GraphData } from '../services/graphService';
import lyzrService from '../services/lyzrService';

// Speech Recognition API
const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Loader,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Phone,
  AlertCircle,
  Lightbulb,
  Clock,
  Database,
  MapPin,
  Satellite,
  Eye,
  Network,
  Copy,
  ExternalLink,
  Zap,
  Sparkles,
  ArrowUp,
  Mic
} from 'lucide-react';

interface ChatInterfaceProps {
  entities: Entity[];
  relationships: Relationship[];
  graphData: GraphData;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ entities, relationships, graphData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userId] = useState('user_' + Math.random().toString(36).substr(2, 9));
  const [sessionId] = useState('session_' + Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lyzrStatus, setLyzrStatus] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Enhanced quick actions with better categorization
  const quickActions = [
    { text: "What satellites cover Mumbai?", category: "Geographic" },
    { text: "Show me DEM data for Kerala", category: "Data Products" },
    { text: "Which sensors does Cartosat-3 carry?", category: "Satellites" },
    { text: "Find recent coastal imagery", category: "Applications" },
    { text: "List all RISAT satellites", category: "Satellites" },
    { text: "What's available for agriculture monitoring?", category: "Applications" }
  ];

  useEffect(() => {
    // Update RAG service with current knowledge base
    ragService.updateKnowledgeBase(entities, relationships, graphData);
    
    // Send enhanced welcome message
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: "👋 **Welcome to MOSDAC AI Assistant!**\n\nI'm here to help you explore satellite data, missions, and geographic coverage. I can assist with:\n\n🛰️ **Satellite Information** - Mission details, capabilities, and status\n📡 **Sensor Data** - Specifications and applications\n🗺️ **Geographic Coverage** - Regional data availability\n📊 **Data Products** - Formats, processing levels, and access\n\nWhat would you like to discover today?",
        timestamp: new Date(),
        metadata: {
          confidence: 1.0,
          sources: [],
          queryResult: undefined
        }
      };
      setMessages([welcomeMessage]);
    }
  }, [entities, relationships, graphData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check Lyzr configuration status
    const checkLyzrStatus = () => {
      const status = lyzrService.getStatus();
      if (status.configured && status.hasApiKey) {
        setLyzrStatus('Enhanced AI Active');
      } else {
        setLyzrStatus('Standard Mode');
      }
    };

    checkLyzrStatus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText: string = inputMessage) => {
    if (!messageText.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await ragService.processMessage(messageText.trim(), userId, sessionId);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: "I apologize, but I encountered an issue processing your request. Please try again or rephrase your question.",
        timestamp: new Date(),
        metadata: {
          confidence: 0,
          sources: []
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action: string) => {
    setInputMessage(action);
    handleSendMessage(action);
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      handleSendMessage(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatMessageContent = (content: string): string => {
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/^(\d+\.\s)/gm, '<strong>$1</strong>')
      .replace(/^(•\s)/gm, '<span class="text-blue-600">$1</span>');
    
    return formatted;
  };

  const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
              isUser 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                : isSystem 
                ? 'bg-gradient-to-br from-gray-400 to-gray-600' 
                : 'bg-gradient-to-br from-emerald-500 to-teal-600'
            }`}>
              {isUser ? (
                <User className="w-5 h-5 text-white" />
              ) : isSystem ? (
                <AlertCircle className="w-5 h-5 text-white" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
          </div>

          {/* Message Content */}
          <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
            <div className={`rounded-2xl px-6 py-4 max-w-full backdrop-blur-sm ${
              isUser 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                : isSystem 
                ? 'bg-white/80 text-gray-800 border border-gray-200/50 shadow-lg shadow-black/5'
                : 'bg-white/90 text-gray-800 border border-gray-200/50 shadow-lg shadow-black/5'
            }`}>
              {/* Message text with enhanced formatting */}
              <div 
                className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}
                dangerouslySetInnerHTML={{
                  __html: formatMessageContent(message.content)
                }}
              />

              {/* Enhanced metadata for assistant messages */}
              {!isUser && message.metadata && (
                <div className="mt-4 pt-4 border-t border-gray-100/50">
                  {/* Confidence indicator */}
                  {message.metadata.confidence !== undefined && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span className="font-medium">Response Confidence</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              message.metadata.confidence > 0.8 ? 'bg-green-500' :
                              message.metadata.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${message.metadata.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-xs">{(message.metadata.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  {message.metadata.sources && message.metadata.sources.length > 0 && (
                    <div className="text-xs text-gray-500 mb-3">
                      <div className="font-medium mb-2 flex items-center">
                        <Database className="w-3 h-3 mr-1" />
                        Knowledge Sources
                      </div>
                      <div className="space-y-1">
                        {message.metadata.sources.slice(0, 2).map((source, index) => (
                          <div key={index} className="flex items-center text-xs">
                            <ExternalLink className="w-3 h-3 mr-1 text-blue-500" />
                            <span className="truncate">{source}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Human escalation indicator */}
                  {message.metadata.fallbackReason && (
                    <div className="flex items-center text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                      <AlertCircle className="w-3 h-3 mr-2" />
                      <span>Complex query - human expert recommended</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timestamp and actions */}
            <div className="flex items-center space-x-3 mt-2">
              <div className="text-xs text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {message.timestamp.toLocaleTimeString()}
              </div>

              {/* Action buttons for assistant messages */}
              {!isUser && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center transition-colors"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </button>
                  <button className="text-xs text-gray-400 hover:text-green-600 flex items-center transition-colors">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Helpful
                  </button>
                  <button className="text-xs text-gray-400 hover:text-red-600 flex items-center transition-colors">
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    Not helpful
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TypingIndicator: React.FC = () => (
    <div className="flex justify-start mb-6">
      <div className="flex mr-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl px-6 py-4 shadow-lg shadow-black/5">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <span className="text-sm text-gray-600 ml-2">AI is thinking...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-black/5 border border-white/20 flex flex-col h-[calc(100vh-8rem)]">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">MOSDAC AI Assistant</h2>
                    <p className="text-sm text-gray-500 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      {lyzrStatus} • Ready to help
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {!lyzrService.isReady() && (
                    <button 
                      onClick={() => setShowApiKeyModal(true)}
                      className="flex items-center px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Enhance AI
                    </button>
                  )}
                  <button className="flex items-center px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Phone className="w-4 h-4 mr-2" />
                    Human Expert
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-gray-200/50">
                <div className="flex space-x-4">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about satellites, sensors, data products, or locations..."
                      className="w-full px-6 py-4 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-lg shadow-black/5"
                      disabled={isTyping || isListening}
                    />
                  </div>
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isTyping}
                    className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 shadow-lg ${
                      isListening
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/25 animate-pulse'
                        : 'bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-green-500/25'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isTyping || !inputMessage.trim()}
                    className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
                  >
                    {isTyping ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <ArrowUp className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Quick Actions */}
                {messages.length <= 1 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-3 font-medium">Quick start:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.slice(0, 4).map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickAction(action.text)}
                          className="text-left text-sm px-4 py-3 bg-white/60 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white/80 transition-all duration-200 border border-gray-200/50 shadow-sm"
                        >
                          <div className="font-medium">{action.text}</div>
                          <div className="text-xs text-gray-500 mt-1">{action.category}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Knowledge Base Status */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-black/5 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-500" />
                Knowledge Base
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Satellite className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-600">Entities</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 bg-blue-100 px-2 py-1 rounded-lg">{entities.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Network className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Relationships</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 bg-green-100 px-2 py-1 rounded-lg">{relationships.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 text-purple-500 mr-2" />
                    <span className="text-sm text-gray-600">Graph Nodes</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 bg-purple-100 px-2 py-1 rounded-lg">{graphData.nodes.length}</span>
                </div>
              </div>
            </div>

            {/* AI Tips */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-black/5 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                Smart Tips
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                  <span>Be specific about locations (e.g., "Mumbai" instead of "city")</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
                  <span>Mention satellite names like "Cartosat-3" or "RISAT-1A"</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2"></div>
                  <span>Ask about data types like "DEM", "LULC", or "satellite imagery"</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2"></div>
                  <span>Include time references like "recent" or "latest"</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-black/5 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.slice(4).map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.text)}
                    className="w-full text-left text-sm px-4 py-3 bg-gray-50/80 text-gray-700 rounded-xl hover:bg-gray-100/80 transition-colors border border-gray-200/50"
                  >
                    <div className="font-medium">{action.text}</div>
                    <div className="text-xs text-gray-500 mt-1">{action.category}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Enhance AI Capabilities</h3>
            <p className="text-sm text-gray-600 mb-6">
              Connect your Lyzr API key to unlock advanced AI features and enhanced response quality.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lyzr API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-default-..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (apiKeyInput.trim()) {
                    localStorage.setItem('lyzr_api_key', apiKeyInput.trim());
                    lyzrService.configure(apiKeyInput.trim());
                    setShowApiKeyModal(false);
                    setApiKeyInput('');
                    setLyzrStatus('Enhanced AI Active');
                  }
                }}
                disabled={!apiKeyInput.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;