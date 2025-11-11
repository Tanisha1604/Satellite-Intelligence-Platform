import React, { useState, useEffect } from 'react';
import { Bot, Database, Search, MessageCircle, Settings, Activity, Clock, Users, CheckCircle, AlertCircle, Zap, Network, Globe, Eye, Satellite, MapPin, Brain, TrendingUp, Shield, Cpu, Server, Wifi } from 'lucide-react';
import realHealthService from '../services/realHealthService';
import realAnalyticsService from '../services/realAnalyticsService';
import realDeploymentService from '../services/realDeploymentService';
import localDatabase from '../services/localDatabase';
import lyzrService from '../services/lyzrService';

interface SystemMetrics {
  responseTime: number;
  accuracy: number;
  activeUsers: number;
  lastUpdate: string;
  totalQueries: number;
  successRate: number;
  errorRate: number;
  knowledgeBaseSize: number;
}

interface ComponentStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  uptime: number;
  lastCheck: Date;
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [componentStatuses, setComponentStatuses] = useState<ComponentStatus[]>([]);
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<any>(null);
  const [deploymentInfo, setDeploymentInfo] = useState<any>(null);
  const [performanceTrends, setPerformanceTrends] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'knowledge', label: 'Knowledge', icon: Database },
    { id: 'pipeline', label: 'Pipeline', icon: Settings },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'interface', label: 'Interface', icon: MessageCircle },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ];

  useEffect(() => {
    loadRealSystemData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadRealSystemData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadRealSystemData = async () => {
    try {
      setIsLoading(true);

      // Load real health data
      const healthData = await realHealthService.performFullHealthCheck();
      
      // Load analytics data
      const analyticsMetrics = realAnalyticsService.getCurrentMetrics();
      const trends = realAnalyticsService.getPerformanceTrends(7);
      
      // Load knowledge base stats
      const kbStats = await localDatabase.getStats();
      
      // Load deployment info
      const currentEnv = realDeploymentService.getCurrentEnvironment();
      
      // Transform health data to component statuses
      const components: ComponentStatus[] = healthData.components.map(comp => ({
        name: comp.name,
        status: comp.status,
        message: comp.message,
        uptime: healthData.uptime,
        lastCheck: comp.lastCheck
      }));

      setComponentStatuses(components);

      // Create real system metrics
      const metrics: SystemMetrics = {
        responseTime: analyticsMetrics?.averageResponseTime || 0,
        accuracy: components.filter(c => c.status === 'healthy').length / components.length * 100,
        activeUsers: analyticsMetrics?.activeUsers || 0,
        lastUpdate: new Date().toLocaleTimeString(),
        totalQueries: analyticsMetrics?.totalQueries || 0,
        successRate: analyticsMetrics?.successRate || 0,
        errorRate: analyticsMetrics?.errorRate || 0,
        knowledgeBaseSize: kbStats.totalEntities + kbStats.totalFAQs + kbStats.totalRelationships
      };

      setSystemMetrics(metrics);
      setKnowledgeBaseStats(kbStats);
      setDeploymentInfo(currentEnv);
      setPerformanceTrends(trends);

    } catch (error) {
      console.error('Error loading system data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard: React.FC<{ 
    title: string; 
    value: string; 
    status: 'good' | 'warning' | 'error'; 
    icon: React.ElementType;
    subtitle?: string;
    trend?: 'up' | 'down' | 'stable';
  }> = ({ title, value, status, icon: Icon, subtitle, trend }) => (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl backdrop-blur-sm ${
          status === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
          status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2">
          {trend && (
            <div className={`text-xs px-2 py-1 rounded-full backdrop-blur-sm ${
              trend === 'up' ? 'bg-emerald-500/20 text-emerald-300' :
              trend === 'down' ? 'bg-red-500/20 text-red-300' :
              'bg-slate-500/20 text-slate-300'
            }`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </div>
          )}
          <div className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
            status === 'good' ? 'bg-emerald-500/20 text-emerald-300' :
            status === 'warning' ? 'bg-amber-500/20 text-amber-300' :
            'bg-red-500/20 text-red-300'
          }`}>
            {status === 'good' ? 'Optimal' : status === 'warning' ? 'Warning' : 'Error'}
          </div>
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-white/70">{title}</div>
      {subtitle && <div className="text-xs text-white/50 mt-1">{subtitle}</div>}
    </div>
  );

  const ComponentStatusCard: React.FC<{ component: ComponentStatus }> = ({ component }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'text-emerald-400 bg-emerald-500/20';
        case 'warning': return 'text-amber-400 bg-amber-500/20';
        case 'error': return 'text-red-400 bg-red-500/20';
        default: return 'text-slate-400 bg-slate-500/20';
      }
    };

    const getComponentIcon = (name: string) => {
      switch (name) {
        case 'Frontend UI': return Globe;
        case 'Knowledge Base': return Database;
        case 'NLP Engine': return Brain;
        case 'Query Engine': return Search;
        case 'Chat Interface': return MessageCircle;
        case 'Lyzr AI Integration': return Zap;
        default: return Activity;
      }
    };

    const Icon = getComponentIcon(component.name);

    return (
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg backdrop-blur-sm ${getStatusColor(component.status)}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-white">{component.name}</h4>
              <p className="text-sm text-white/70">{component.message}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getStatusColor(component.status)}`}>
            {component.status}
          </div>
        </div>
        <div className="text-xs text-white/50">
          Last checked: {component.lastCheck.toLocaleTimeString()}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading system data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 mr-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">MOSDAC AI</h1>
                <p className="text-sm text-white/60">Real-time system monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-white/70 backdrop-blur-sm bg-white/10 rounded-full px-4 py-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  componentStatuses.every(c => c.status === 'healthy') ? 'bg-emerald-400' :
                  componentStatuses.some(c => c.status === 'error') ? 'bg-red-400' : 'bg-amber-400'
                }`}></div>
                {componentStatuses.every(c => c.status === 'healthy') ? 'All Systems Operational' : 'Issues Detected'}
              </div>
              <button
                onClick={loadRealSystemData}
                className="flex items-center px-4 py-2 text-sm backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300 text-white"
              >
                <Activity className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex space-x-2 mb-8 backdrop-blur-xl bg-white/5 rounded-2xl p-2 border border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'overview' && systemMetrics && (
          <div className="space-y-8">
            {/* Real-time Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Response Time"
                value={`${systemMetrics.responseTime.toFixed(0)}ms`}
                status={systemMetrics.responseTime < 2000 ? 'good' : systemMetrics.responseTime < 5000 ? 'warning' : 'error'}
                icon={Clock}
                subtitle="Target: < 2000ms"
                trend={systemMetrics.responseTime < 2000 ? 'stable' : 'up'}
              />
              <MetricCard
                title="System Health"
                value={`${systemMetrics.accuracy.toFixed(1)}%`}
                status={systemMetrics.accuracy > 90 ? 'good' : systemMetrics.accuracy > 70 ? 'warning' : 'error'}
                icon={Shield}
                subtitle="Component average"
                trend="stable"
              />
              <MetricCard
                title="Active Users"
                value={systemMetrics.activeUsers.toString()}
                status="good"
                icon={Users}
                subtitle="Last 5 minutes"
                trend="stable"
              />
              <MetricCard
                title="Knowledge Base"
                value={systemMetrics.knowledgeBaseSize.toString()}
                status="good"
                icon={Database}
                subtitle="Total entities"
                trend="up"
              />
            </div>

            {/* Component Health */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Server className="w-6 h-6 mr-3 text-blue-400" />
                System Components
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {componentStatuses.map((component, index) => (
                  <ComponentStatusCard key={index} component={component} />
                ))}
              </div>
            </div>

            {/* System Architecture */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Network className="w-6 h-6 mr-3 text-purple-400" />
                Architecture Overview
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Database className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Knowledge Base</h4>
                  <p className="text-sm text-white/70 mb-3">
                    {knowledgeBaseStats ? 
                      `${knowledgeBaseStats.totalEntities} entities, ${knowledgeBaseStats.totalFAQs} FAQs` :
                      'Loading...'
                    }
                  </p>
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                    knowledgeBaseStats?.totalEntities > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {knowledgeBaseStats?.totalEntities > 0 ? 'Active' : 'Initializing'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Search className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Query Engine</h4>
                  <p className="text-sm text-white/70 mb-3">
                    {systemMetrics.totalQueries} queries processed
                  </p>
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                    systemMetrics.successRate > 90 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {systemMetrics.successRate.toFixed(1)}% success
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">AI Interface</h4>
                  <p className="text-sm text-white/70 mb-3">
                    {lyzrService.isReady() ? 'Enhanced AI Active' : 'Standard Mode'}
                  </p>
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                    lyzrService.isReady() ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {lyzrService.isReady() ? 'Enhanced' : 'Standard'}
                  </div>
                </div>
              </div>
            </div>

            {/* Deployment Status */}
            {deploymentInfo && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <Satellite className="w-6 h-6 mr-3 text-green-400" />
                  Deployment Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
                    <div className="text-sm text-white/60 mb-1">Environment</div>
                    <div className="font-semibold text-white">{deploymentInfo.name}</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
                    <div className="text-sm text-white/60 mb-1">Version</div>
                    <div className="font-semibold text-white">{deploymentInfo.version}</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
                    <div className="text-sm text-white/60 mb-1">Status</div>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                      deploymentInfo.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {deploymentInfo.status}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'knowledge' && knowledgeBaseStats && (
          <div className="space-y-8">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Database className="w-6 h-6 mr-3 text-blue-400" />
                Knowledge Base Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 backdrop-blur-sm bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="text-4xl font-bold text-blue-400 mb-2">{knowledgeBaseStats.totalEntities}</div>
                  <div className="text-sm text-blue-300 font-medium">Entities</div>
                  <div className="text-xs text-blue-200/70 mt-1">Satellites, sensors, locations</div>
                </div>
                <div className="text-center p-6 backdrop-blur-sm bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <div className="text-4xl font-bold text-emerald-400 mb-2">{knowledgeBaseStats.totalFAQs}</div>
                  <div className="text-sm text-emerald-300 font-medium">FAQs</div>
                  <div className="text-xs text-emerald-200/70 mt-1">Curated questions</div>
                </div>
                <div className="text-center p-6 backdrop-blur-sm bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="text-4xl font-bold text-purple-400 mb-2">{knowledgeBaseStats.totalRelationships}</div>
                  <div className="text-sm text-purple-300 font-medium">Relationships</div>
                  <div className="text-xs text-purple-200/70 mt-1">Entity connections</div>
                </div>
              </div>
              <div className="mt-6 text-sm text-white/50 text-center">
                Last updated: {new Date(knowledgeBaseStats.lastUpdated).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && systemMetrics && (
          <div className="space-y-8">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <TrendingUp className="w-6 h-6 mr-3 text-green-400" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="backdrop-blur-sm bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-400" />
                    Response Time
                  </h4>
                  <div className="text-3xl font-bold text-blue-400 mb-2">{systemMetrics.responseTime.toFixed(0)}ms</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full ${
                        systemMetrics.responseTime < 2000 ? 'bg-emerald-400' : 
                        systemMetrics.responseTime < 5000 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min((systemMetrics.responseTime / 5000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-white/60">Target: &lt; 2000ms</div>
                </div>
                
                <div className="backdrop-blur-sm bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-emerald-400" />
                    Success Rate
                  </h4>
                  <div className="text-3xl font-bold text-emerald-400 mb-2">{systemMetrics.successRate.toFixed(1)}%</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div 
                      className="bg-emerald-400 h-2 rounded-full" 
                      style={{ width: `${systemMetrics.successRate}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-white/60">Target: &gt; 95%</div>
                </div>
              </div>
            </div>

            {/* Component Performance */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Cpu className="w-6 h-6 mr-3 text-purple-400" />
                Component Performance
              </h3>
              <div className="space-y-4">
                {componentStatuses.map((component, index) => (
                  <div key={index} className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-4 ${
                        component.status === 'healthy' ? 'bg-emerald-400' :
                        component.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                      }`}></div>
                      <div>
                        <div className="font-medium text-white">{component.name}</div>
                        <div className="text-sm text-white/70">{component.message}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        {Math.floor(component.uptime / 1000 / 60)}m uptime
                      </div>
                      <div className="text-xs text-white/50">
                        {component.lastCheck.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Other tabs with glassmorphism styling */}
        {activeTab === 'pipeline' && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Settings className="w-6 h-6 mr-3 text-orange-400" />
              Content Processing Pipeline
            </h3>
            <div className="text-center py-12">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Activity className="w-10 h-10 text-white" />
              </div>
              <p className="text-white/70 text-lg">
                Pipeline has processed {knowledgeBaseStats?.totalEntities || 0} entities
                and discovered {knowledgeBaseStats?.totalRelationships || 0} relationships.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Search className="w-6 h-6 mr-3 text-cyan-400" />
              Search & Retrieval
            </h3>
            <div className="text-center py-12">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Search className="w-10 h-10 text-white" />
              </div>
              <p className="text-white/70 text-lg">
                Query engine has processed {systemMetrics?.totalQueries || 0} queries 
                with {systemMetrics?.successRate.toFixed(1) || 0}% success rate.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'interface' && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <MessageCircle className="w-6 h-6 mr-3 text-pink-400" />
              Conversational Interface
            </h3>
            <div className="text-center py-12">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <p className="text-white/70 text-lg">
                AI interface is {lyzrService.isReady() ? 'enhanced with Lyzr AI' : 'running in standard mode'}.
                Current response time: {systemMetrics?.responseTime.toFixed(0) || 0}ms.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;