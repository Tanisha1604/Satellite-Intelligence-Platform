import React, { useState, useEffect } from 'react';
import moduleManager, { DeploymentProfile, ModuleConfig } from '../services/moduleManager';
import { 
  Rocket, 
  Settings, 
  Globe, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Upload,
  Copy,
  Edit,
  Trash2,
  Plus,
  Monitor,
  Palette,
  Code
} from 'lucide-react';

const DeploymentManager: React.FC = () => {
  const [profiles, setProfiles] = useState<DeploymentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<DeploymentProfile | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ModuleConfig | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadProfiles();
    loadCurrentConfig();
    performHealthCheck();
  }, []);

  const loadProfiles = () => {
    const availableProfiles = moduleManager.getAvailableProfiles();
    setProfiles(availableProfiles);
  };

  const loadCurrentConfig = () => {
    const config = moduleManager.getCurrentConfig();
    setCurrentConfig(config);
  };

  const performHealthCheck = async () => {
    const health = await moduleManager.performHealthCheck();
    setHealthStatus(health);
  };

  const deployProfile = async (profileName: string) => {
    setDeploymentStatus('deploying');
    try {
      const success = await moduleManager.deployProfile(profileName);
      if (success) {
        setDeploymentStatus('success');
        loadCurrentConfig();
        performHealthCheck();
        setTimeout(() => setDeploymentStatus('idle'), 3000);
      } else {
        setDeploymentStatus('error');
        setTimeout(() => setDeploymentStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      setDeploymentStatus('error');
      setTimeout(() => setDeploymentStatus('idle'), 3000);
    }
  };

  const exportConfiguration = () => {
    const config = moduleManager.exportConfiguration();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'deployment-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = moduleManager.importConfiguration(content);
        if (success) {
          loadProfiles();
          loadCurrentConfig();
        } else {
          alert('Failed to import configuration');
        }
      };
      reader.readAsText(file);
    }
  };

  const ProfileCard: React.FC<{ profile: DeploymentProfile }> = ({ profile }) => {
    const isActive = selectedProfile?.name === profile.name;

    return (
      <div 
        className={`bg-white rounded-xl p-6 shadow-sm border cursor-pointer transition-all ${
          isActive ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-100 hover:border-gray-200'
        }`}
        onClick={() => setSelectedProfile(profile)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{profile.name}</h3>
              <p className="text-sm text-gray-600">{profile.domain}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deployProfile(profile.key);
              }}
              disabled={deploymentStatus === 'deploying'}
              className="flex items-center px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Rocket className="w-4 h-4 mr-1" />
              Deploy
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">{profile.description}</p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Features</span>
            <span className="text-gray-900">
              {Object.values(profile.customization.features).filter(Boolean).length}/4 enabled
            </span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {Object.entries(profile.customization.features).map(([feature, enabled]) => (
              <span
                key={feature}
                className={`px-2 py-1 text-xs rounded-full ${
                  enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const HealthStatusCard: React.FC = () => {
    if (!healthStatus) return null;

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Monitor className="w-5 h-5 mr-2" />
          System Health
        </h3>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">Overall Status</span>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            healthStatus.overall === 'healthy' ? 'bg-green-100 text-green-800' :
            healthStatus.overall === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {healthStatus.overall === 'healthy' ? <CheckCircle className="w-4 h-4 mr-1" /> :
             <AlertTriangle className="w-4 h-4 mr-1" />}
            {healthStatus.overall}
          </div>
        </div>
        
        <div className="space-y-3">
          {Object.entries(healthStatus.modules).map(([module, status]: [string, any]) => (
            <div key={module} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{module}</span>
              <div className={`flex items-center text-sm ${
                status.status === 'healthy' ? 'text-green-600' :
                status.status === 'warning' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {status.status === 'healthy' ? <CheckCircle className="w-4 h-4 mr-1" /> :
                 <AlertTriangle className="w-4 h-4 mr-1" />}
                {status.status}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={performHealthCheck}
          className="w-full mt-4 flex items-center justify-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Refresh Health Check
        </button>
      </div>
    );
  };

  const ConfigurationPanel: React.FC = () => {
    if (!currentConfig) return null;

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Current Configuration
        </h3>
        
        <div className="space-y-4">
          {Object.entries(currentConfig).map(([module, config]) => (
            <div key={module} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 capitalize">{module}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  (config as any).enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {(config as any).enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {Object.entries(config).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}:</span>
                    <span className="font-mono text-xs">
                      {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) + '...' : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => setShowConfigModal(true)}
          className="w-full mt-4 flex items-center justify-center px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Configuration
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Rocket className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Deployment Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              {deploymentStatus === 'deploying' && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Deploying...
                </div>
              )}
              {deploymentStatus === 'success' && (
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Deployed Successfully
                </div>
              )}
              {deploymentStatus === 'error' && (
                <div className="flex items-center text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Deployment Failed
                </div>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Profile
              </button>
              <button
                onClick={exportConfiguration}
                className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Config
              </button>
              <label className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Import Config
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfiguration}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deployment Profiles */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployment Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <ProfileCard key={profile.name} profile={profile} />
              ))}
            </div>
            
            {selectedProfile && (
              <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Branding</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Title:</span>
                        <span className="text-gray-900">{selectedProfile.customization.branding.title}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Primary Color:</span>
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded mr-2"
                            style={{ backgroundColor: selectedProfile.customization.branding.primaryColor }}
                          ></div>
                          <span className="text-gray-900 font-mono text-xs">
                            {selectedProfile.customization.branding.primaryColor}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Sample Queries</h4>
                    <div className="space-y-1">
                      {selectedProfile.customization.content.sampleQueries.slice(0, 3).map((query, index) => (
                        <div key={index} className="text-sm text-gray-600 truncate">
                          • {query}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <HealthStatusCard />
            <ConfigurationPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentManager;