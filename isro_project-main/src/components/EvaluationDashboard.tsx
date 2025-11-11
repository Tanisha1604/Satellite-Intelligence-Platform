import React, { useState, useEffect } from 'react';
import evaluationService, { EvaluationReport, EvaluationMetrics } from '../services/evaluationService';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  Zap,
  Brain,
  MessageSquare,
  Activity
} from 'lucide-react';

const EvaluationDashboard: React.FC = () => {
  const [reports, setReports] = useState<EvaluationReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<EvaluationReport | null>(null);
  const [performanceTrends, setPerformanceTrends] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<number>(30);

  useEffect(() => {
    loadEvaluationData();
  }, [timeRange]);

  const loadEvaluationData = () => {
    // In a real implementation, this would fetch from the evaluation service
    const trends = evaluationService.getPerformanceTrends(timeRange);
    setPerformanceTrends(trends);
  };

  const exportData = (format: 'json' | 'csv') => {
    const data = evaluationService.exportEvaluationData(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evaluation-report.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const MetricCard: React.FC<{
    title: string;
    value: number;
    target: number;
    icon: React.ElementType;
    color: string;
    format?: 'percentage' | 'number';
  }> = ({ title, value, target, icon: Icon, color, format = 'percentage' }) => {
    const displayValue = format === 'percentage' ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);
    const displayTarget = format === 'percentage' ? `${(target * 100).toFixed(0)}%` : target.toFixed(2);
    const isOnTarget = value >= target;

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg bg-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isOnTarget ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isOnTarget ? 'On Target' : 'Below Target'}
          </div>
        </div>
        <div className="mb-2">
          <div className="text-2xl font-bold text-gray-900">{displayValue}</div>
          <div className="text-sm text-gray-600">{title}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Target: {displayTarget}</span>
          <div className={`flex items-center ${isOnTarget ? 'text-green-600' : 'text-yellow-600'}`}>
            {isOnTarget ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
        </div>
      </div>
    );
  };

  const TrendChart: React.FC<{ data: any; title: string }> = ({ data, title }) => {
    if (!data || !data.dates.length) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No trend data available
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {data.overallScore.map((score: number, index: number) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="bg-indigo-600 rounded-t w-full min-h-1"
                style={{ height: `${score * 100}%` }}
              ></div>
              <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                {data.dates[index]?.split('-').slice(1).join('/')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Mock current metrics for demonstration
  const currentMetrics: EvaluationMetrics = {
    intentRecognitionAccuracy: 0.87,
    entityRecognitionAccuracy: 0.82,
    responseCompleteness: 0.79,
    responseConsistency: 0.85,
    overallScore: 0.83,
    timestamp: new Date()
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Evaluation Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                onClick={() => exportData('json')}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </button>
              <button
                onClick={() => exportData('csv')}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={loadEvaluationData}
                className="flex items-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Intent Recognition Accuracy"
            value={currentMetrics.intentRecognitionAccuracy}
            target={0.85}
            icon={Brain}
            color="blue"
          />
          <MetricCard
            title="Entity Recognition Accuracy"
            value={currentMetrics.entityRecognitionAccuracy}
            target={0.80}
            icon={Target}
            color="green"
          />
          <MetricCard
            title="Response Completeness"
            value={currentMetrics.responseCompleteness}
            target={0.75}
            icon={MessageSquare}
            color="purple"
          />
          <MetricCard
            title="Response Consistency"
            value={currentMetrics.responseConsistency}
            target={0.80}
            icon={Activity}
            color="orange"
          />
        </div>

        {/* Performance Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart data={performanceTrends} title="Overall Performance Trend" />
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Intent Recognition</span>
                  <span className="text-sm text-gray-600">{(currentMetrics.intentRecognitionAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${currentMetrics.intentRecognitionAccuracy * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Entity Recognition</span>
                  <span className="text-sm text-gray-600">{(currentMetrics.entityRecognitionAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${currentMetrics.entityRecognitionAccuracy * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Response Completeness</span>
                  <span className="text-sm text-gray-600">{(currentMetrics.responseCompleteness * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${currentMetrics.responseCompleteness * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Response Consistency</span>
                  <span className="text-sm text-gray-600">{(currentMetrics.responseConsistency * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${currentMetrics.responseConsistency * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Performance Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Immediate Actions</h4>
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="bg-red-100 rounded-full p-1 mt-1">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700">
                    Improve response completeness by enhancing information retrieval depth
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-100 rounded-full p-1 mt-1">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700">
                    Add more domain-specific entity patterns for better recognition
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700">
                    Implement query clarification for ambiguous requests
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Long-term Improvements</h4>
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 rounded-full p-1 mt-1">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700">
                    Expand training data with more diverse query patterns
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 rounded-full p-1 mt-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700">
                    Implement continuous learning from user feedback
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-100 rounded-full p-1 mt-1">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-700">
                    Enhance knowledge graph with additional data sources
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Performance Metrics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Intent Recognition Accuracy
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(currentMetrics.intentRecognitionAccuracy * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">85%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      On Target
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Entity Recognition Accuracy
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(currentMetrics.entityRecognitionAccuracy * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">80%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      On Target
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Response Completeness
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(currentMetrics.responseCompleteness * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">75%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      On Target
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Response Consistency
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(currentMetrics.responseConsistency * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">80%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      On Target
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationDashboard;