import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Server, Database, Cpu, HardDrive, Zap } from 'lucide-react';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
}

const SystemStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const metrics: SystemMetric[] = [
    {
      name: 'CPU Usage',
      value: 45,
      unit: '%',
      status: 'good',
      icon: Cpu
    },
    {
      name: 'Memory Usage',
      value: 67,
      unit: '%',
      status: 'warning',
      icon: HardDrive
    },
    {
      name: 'Database Load',
      value: 23,
      unit: '%',
      status: 'good',
      icon: Database
    },
    {
      name: 'API Response Time',
      value: 120,
      unit: 'ms',
      status: 'good',
      icon: Server
    },
    {
      name: 'Active Connections',
      value: 89,
      unit: '',
      status: 'good',
      icon: Zap
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // Simulate online/offline status
      setIsOnline(Math.random() > 0.1); // 90% uptime
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">System Health Monitor</h1>
              <p className="text-gray-600">Real-time monitoring of MOSDAC AI platform components</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center px-4 py-2 rounded-lg border ${
                isOnline ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className={`p-6 rounded-xl border backdrop-blur-sm bg-white/70 ${getStatusColor(metric.status)}`}>
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-8 h-8" />
                  <span className="text-2xl font-bold">{metric.value}{metric.unit}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900">{metric.name}</h3>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        metric.status === 'good' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Status */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Service Status
            </h2>
            <div className="space-y-3">
              {[
                { name: 'NLP Service', status: 'operational', uptime: '99.9%' },
                { name: 'Graph Database', status: 'operational', uptime: '99.8%' },
                { name: 'API Gateway', status: 'operational', uptime: '99.7%' },
                { name: 'Voice Assistant', status: 'operational', uptime: '99.5%' },
                { name: 'Analytics Engine', status: 'maintenance', uptime: '98.2%' }
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      service.status === 'operational' ? 'bg-green-500' :
                      service.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium text-gray-900">{service.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{service.uptime} uptime</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Server className="w-5 h-5 mr-2 text-blue-600" />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {[
                { time: '2 min ago', event: 'API request processed', type: 'success' },
                { time: '5 min ago', event: 'Database backup completed', type: 'success' },
                { time: '8 min ago', event: 'Voice query handled', type: 'success' },
                { time: '12 min ago', event: 'Memory usage spike detected', type: 'warning' },
                { time: '15 min ago', event: 'System health check passed', type: 'success' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-900">{activity.event}</span>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
