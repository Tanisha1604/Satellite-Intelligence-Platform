import React from 'react';
import { useState } from 'react';
import KnowledgeGraph from './components/KnowledgeGraph';
import QueryInterface from './components/QueryInterface';
import ChatInterface from './components/ChatInterface';
import ISROAssistant from './components/ISROAssistant';
import Dashboard from './components/Dashboard';
import EvaluationDashboard from './components/EvaluationDashboard';
import DeploymentManager from './components/DeploymentManager';
import SystemStatus from './components/SystemStatus';
import { Entity, Relationship } from './services/nlpService';
import { GraphData } from './services/graphService';
import { Network, MessageCircle, BarChart3, Bot, Target, Rocket, Activity, Mic } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState<'knowledge' | 'query' | 'chat' | 'voice' | 'dashboard' | 'evaluation' | 'deployment' | 'status'>('chat');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });

  const handleKnowledgeUpdate = (newEntities: Entity[], newRelationships: Relationship[], newGraphData: GraphData) => {
    setEntities(newEntities);
    setRelationships(newRelationships);
    setGraphData(newGraphData);
  };

  const navigationItems = [
    { id: 'chat', label: 'AI Assistant', icon: Bot, description: 'Intelligent chat interface' },
    { id: 'voice', label: 'ISRO Assistant', icon: Mic, description: 'Voice-enabled chatbot' },
    { id: 'knowledge', label: 'Knowledge Graph', icon: Network, description: 'Explore data relationships' },
    { id: 'query', label: 'Query Engine', icon: MessageCircle, description: 'Advanced search capabilities' },
    { id: 'dashboard', label: 'Analytics', icon: BarChart3, description: 'System insights' },
    { id: 'evaluation', label: 'Performance', icon: Target, description: 'Quality metrics' },
    { id: 'deployment', label: 'Deployment', icon: Rocket, description: 'Environment management' },
    { id: 'status', label: 'System Health', icon: Activity, description: 'Real-time monitoring' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Glassmorphism Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-lg shadow-black/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo & Brand */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Network className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 tracking-tight">MOSDAC AI</h1>
                  <p className="text-sm text-gray-500 font-medium">Satellite Intelligence Platform</p>
                </div>
              </div>

              {/* Navigation Pills */}
              <div className="flex items-center space-x-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id as any)}
                      className={`group relative flex items-center px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/90 text-blue-600 shadow-lg shadow-black/10 backdrop-blur-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mr-2 transition-colors ${
                        isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                      }`} />
                      <span className="text-sm">{item.label}</span>

                      {/* Tooltip */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {item.description}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-20">
        {/* Content with smooth transitions */}
        <div className="transition-all duration-300 ease-in-out">
          {activeView === 'knowledge' && (
            <div className="animate-fadeIn">
              <KnowledgeGraph onKnowledgeUpdate={handleKnowledgeUpdate} />
            </div>
          )}
          {activeView === 'query' && (
            <div className="animate-fadeIn">
              <QueryInterface 
                entities={entities} 
                relationships={relationships} 
                graphData={graphData} 
              />
            </div>
          )}
          {activeView === 'chat' && (
            <div className="animate-fadeIn">
              <ChatInterface
                entities={entities}
                relationships={relationships}
                graphData={graphData}
              />
            </div>
          )}
          {activeView === 'voice' && (
            <div className="animate-fadeIn">
              <ISROAssistant />
            </div>
          )}
          {activeView === 'dashboard' && (
            <div className="animate-fadeIn">
              <Dashboard />
            </div>
          )}
          {activeView === 'evaluation' && (
            <div className="animate-fadeIn">
              <EvaluationDashboard />
            </div>
          )}
          {activeView === 'deployment' && (
            <div className="animate-fadeIn">
              <DeploymentManager />
            </div>
          )}
          {activeView === 'status' && (
            <div className="animate-fadeIn">
              <SystemStatus />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;