import React, { useState, useEffect } from 'react';
import crawlerService, { CrawlResult } from '../services/crawlerService';
import nlpService, { Entity, Relationship } from '../services/nlpService';
import graphService, { GraphData, GraphMetrics } from '../services/graphService';
import localDatabase from '../services/localDatabase';
import { 
  Globe, 
  Database, 
  Brain, 
  Network, 
  Satellite, 
  MapPin, 
  FileText, 
  Search,
  Download,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Eye,
  Settings
} from 'lucide-react';

interface CrawlStatus {
  status: 'idle' | 'crawling' | 'processing' | 'completed' | 'error';
  progress: number;
  currentTask: string;
  documentsProcessed: number;
  entitiesExtracted: number;
  relationshipsFound: number;
}

interface KnowledgeGraphProps {
  onKnowledgeUpdate?: (entities: Entity[], relationships: Relationship[], graphData: GraphData) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ onKnowledgeUpdate }) => {
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus>({
    status: 'idle',
    progress: 0,
    currentTask: 'Ready to start crawling',
    documentsProcessed: 0,
    entitiesExtracted: 0,
    relationshipsFound: 0
  });

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [graphMetrics, setGraphMetrics] = useState<GraphMetrics | null>(null);
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [viewMode, setViewMode] = useState<'pipeline' | 'entities' | 'graph' | 'analytics'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);

  useEffect(() => {
    // Set up crawler progress callback
    crawlerService.setProgressCallback((progress) => {
      setCrawlStatus(prev => ({
        ...prev,
        progress: (progress.processedUrls / Math.max(progress.totalUrls, 1)) * 100,
        currentTask: `Processing: ${progress.currentUrl}`,
        documentsProcessed: progress.processedUrls
      }));
    });
    
    // Load existing data on component mount
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      // Load data from local database
      const knowledgeBase = await localDatabase.getAllData();
      
      if (knowledgeBase.entities.length > 0 || knowledgeBase.relationships.length > 0) {
        // Convert stored data to proper format
        const loadedEntities = knowledgeBase.entities.map(e => ({
          ...e,
          mentions: e.mentions || [],
          sourceDocuments: e.sourceDocuments || []
        }));
        
        const loadedRelationships = knowledgeBase.relationships.map(r => ({
          ...r,
          evidence: r.evidence || [],
          sourceUrls: r.sourceUrls || []
        }));
        
        setEntities(loadedEntities);
        setRelationships(loadedRelationships);
        
        // Build graph
        const graph = graphService.buildGraph(loadedEntities, loadedRelationships);
        setGraphData(graph);
        
        // Calculate metrics
        const metrics = graphService.calculateMetrics(graph);
        setGraphMetrics(metrics);
        
        // Update parent component
        onKnowledgeUpdate?.(loadedEntities, loadedRelationships, graph);
        
        setCrawlStatus(prev => ({
          ...prev,
          status: 'completed',
          currentTask: 'Knowledge graph loaded from existing data',
          entitiesExtracted: loadedEntities.length,
          relationshipsFound: loadedRelationships.length
        }));
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const startCrawling = async () => {
    setCrawlStatus(prev => ({ ...prev, status: 'crawling', progress: 0 }));
    
    try {
      // Clear previous data
      nlpService.clear();
      setEntities([]);
      setRelationships([]);
      
      setCrawlStatus(prev => ({ ...prev, currentTask: 'Starting MOSDAC crawl...' }));
      
      // Start crawling
      const results = await crawlerService.startCrawl([
        'https://www.mosdac.gov.in',
        'https://www.mosdac.gov.in/data',
        'https://www.mosdac.gov.in/satellites'
      ]);
      
      setCrawlResults(results);
      setCrawlStatus(prev => ({ ...prev, status: 'processing', currentTask: 'Processing content with NLP...' }));
      
      // Process each crawl result with NLP
      for (const result of results) {
        await nlpService.processText(result.content, result.url);
        
        setCrawlStatus(prev => ({
          ...prev,
          entitiesExtracted: nlpService.getEntities().length,
          relationshipsFound: nlpService.getRelationships().length
        }));
      }
      
      // Get final results
      const extractedEntities = nlpService.getEntities();
      const extractedRelationships = nlpService.getRelationships();
      
      setEntities(extractedEntities);
      setRelationships(extractedRelationships);
      
      // Build graph
      setCrawlStatus(prev => ({ ...prev, currentTask: 'Building knowledge graph...' }));
      const graph = graphService.buildGraph(extractedEntities, extractedRelationships);
      setGraphData(graph);
      
      // Calculate metrics
      const metrics = graphService.calculateMetrics(graph);
      setGraphMetrics(metrics);
      
      // Notify parent component
      onKnowledgeUpdate?.(extractedEntities, extractedRelationships, graph);
      
      setCrawlStatus(prev => ({ 
        ...prev, 
        status: 'completed',
        currentTask: 'Knowledge graph construction completed',
        progress: 100
      }));
      
    } catch (error) {
      console.error('Crawling error:', error);
      setCrawlStatus(prev => ({ 
        ...prev, 
        status: 'error',
        currentTask: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  const filteredEntities = entities.filter(entity => {
    const matchesSearch = !searchQuery || 
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedEntityTypes.length === 0 || 
      selectedEntityTypes.includes(entity.type);
    
    return matchesSearch && matchesType;
  });

  const entityTypes = [...new Set(entities.map(e => e.type))];

  const downloadGraph = () => {
    const graphExport = {
      entities: entities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        confidence: e.confidence
      })),
      relationships: relationships.map(r => ({
        id: r.id,
        source: r.source,
        target: r.target,
        type: r.type,
        confidence: r.confidence
      })),
      metadata: {
        exportDate: new Date().toISOString(),
        totalEntities: entities.length,
        totalRelationships: relationships.length
      }
    };
    
    const dataStr = JSON.stringify(graphExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mosdac-knowledge-graph.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const EntityCard: React.FC<{ entity: Entity }> = ({ entity }) => {
    const getEntityIcon = (type: string) => {
      switch (type) {
        case 'satellite': return Satellite;
        case 'sensor': return Eye;
        case 'data_product': return Database;
        case 'location': return MapPin;
        default: return FileText;
      }
    };

    const getEntityColor = (type: string) => {
      switch (type) {
        case 'satellite': return 'bg-blue-100 text-blue-600';
        case 'sensor': return 'bg-green-100 text-green-600';
        case 'data_product': return 'bg-purple-100 text-purple-600';
        case 'location': return 'bg-orange-100 text-orange-600';
        default: return 'bg-gray-100 text-gray-600';
      }
    };

    const Icon = getEntityIcon(entity.type);

    return (
      <div 
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedEntity(entity)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${getEntityColor(entity.type)}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{(entity.confidence * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
        </div>
        <h4 className="font-medium text-gray-900 mb-2">{entity.name}</h4>
        <div className="text-sm text-gray-600 mb-3 capitalize">{entity.type.replace('_', ' ')}</div>
        <div className="text-xs text-gray-500">
          {entity.mentions.length} mention{entity.mentions.length !== 1 ? 's' : ''} • {entity.sourceDocuments.length} source{entity.sourceDocuments.length !== 1 ? 's' : ''}
        </div>
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
              <Network className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">MOSDAC Knowledge Graph Construction</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  crawlStatus.status === 'completed' ? 'bg-green-500' :
                  crawlStatus.status === 'crawling' || crawlStatus.status === 'processing' ? 'bg-yellow-500' :
                  crawlStatus.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                {crawlStatus.status === 'completed' ? 'Graph Ready' :
                 crawlStatus.status === 'crawling' ? 'Crawling Active' :
                 crawlStatus.status === 'processing' ? 'Processing' :
                 crawlStatus.status === 'error' ? 'Error' : 'Idle'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'pipeline', label: 'Crawling Pipeline', icon: Globe },
            { id: 'entities', label: 'Entity Extraction', icon: Brain },
            { id: 'graph', label: 'Knowledge Graph', icon: Network },
            { id: 'analytics', label: 'Analytics', icon: Zap }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {viewMode === 'pipeline' && (
          <div className="space-y-6">
            {/* Control Panel */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">MOSDAC Content Crawling Pipeline</h3>
                <button
                  onClick={startCrawling}
                  disabled={crawlStatus.status === 'crawling' || crawlStatus.status === 'processing'}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {crawlStatus.status === 'crawling' || crawlStatus.status === 'processing' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Crawling
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{crawlStatus.currentTask}</span>
                  <span className="text-sm text-gray-500">{crawlStatus.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${crawlStatus.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{crawlResults.length}</div>
                      <div className="text-sm text-blue-700">Documents Processed</div>
                    </div>
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{entities.length}</div>
                      <div className="text-sm text-green-700">Entities Extracted</div>
                    </div>
                    <Brain className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{relationships.length}</div>
                      <div className="text-sm text-purple-700">Relationships Found</div>
                    </div>
                    <Network className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Stages */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Content Processing Pipeline</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Data Sources</h4>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Globe className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">Web Portal Content</div>
                        <div className="text-sm text-gray-600">HTML pages, navigation structure</div>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-red-500 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">PDF Documents</div>
                        <div className="text-sm text-gray-600">Technical manuals, research papers</div>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">DOCX Files</div>
                        <div className="text-sm text-gray-600">Documentation, specifications</div>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Database className="w-5 h-5 text-green-500 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">Structured Data</div>
                        <div className="text-sm text-gray-600">Product catalogs, metadata tables</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">NLP Processing Steps</h4>
                  <div className="space-y-3">
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="bg-indigo-100 rounded-full p-1 mt-1 mr-3">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Text Extraction & Cleaning</div>
                        <div className="text-sm text-gray-600">Remove formatting, normalize text</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 rounded-full p-1 mt-1 mr-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Named Entity Recognition</div>
                        <div className="text-sm text-gray-600">Identify satellites, sensors, locations</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="bg-green-100 rounded-full p-1 mt-1 mr-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Relationship Extraction</div>
                        <div className="text-sm text-gray-600">Map connections between entities</div>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="bg-purple-100 rounded-full p-1 mt-1 mr-3">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Graph Construction</div>
                        <div className="text-sm text-gray-600">Build interconnected knowledge graph</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'entities' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Extracted Entities</h3>
              
              {/* Entity Type Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search entities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {entityTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        if (selectedEntityTypes.includes(type)) {
                          setSelectedEntityTypes(prev => prev.filter(t => t !== type));
                        } else {
                          setSelectedEntityTypes(prev => [...prev, type]);
                        }
                      }}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors capitalize ${
                        selectedEntityTypes.includes(type)
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedEntityTypes([])}
                    className="px-3 py-1 text-sm rounded-full border border-gray-300 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-600">
                  Showing {filteredEntities.length} of {entities.length} entities
                </div>
              </div>

              {/* Entity Grid */}
              {filteredEntities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {filteredEntities.map((entity) => (
                    <EntityCard key={entity.id} entity={entity} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {entities.length === 0 
                      ? 'No entities extracted yet. Start crawling to begin entity extraction.'
                      : 'No entities match your search criteria.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Entity Details Modal */}
            {selectedEntity && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Entity Details</h3>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">{selectedEntity.name}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Type</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {selectedEntity.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Confidence</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(selectedEntity.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Mentions</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedEntity.mentions.length}
                        </span>
                      </div>
                      {Object.entries(selectedEntity.attributes).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-sm font-medium text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Mentions</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedEntity.mentions.slice(0, 5).map((mention, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-900 font-medium mb-1">"{mention.text}"</div>
                          <div className="text-xs text-gray-600 mb-2">
                            Confidence: {(mention.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            Context: {mention.context}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'graph' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Interactive Knowledge Graph</h3>
              
              {/* Graph Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search entities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <Search className="w-4 h-4 mr-2" />
                  </div>
                  <select
                    value={selectedEntityTypes.join(',')}
                    onChange={(e) => setSelectedEntityTypes(e.target.value ? e.target.value.split(',') : [])}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Types</option>
                    {entityTypes.map(type => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Clear
                  </button>
                </div>
                <button 
                  onClick={downloadGraph}
                  className="flex items-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Graph
                </button>
              </div>

              {/* Interactive Graph Visualization */}
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 min-h-96 relative overflow-hidden">
                <GraphVisualization 
                  entities={filteredEntities} 
                  relationships={relationships}
                  searchQuery={searchQuery}
                  onNodeClick={setSelectedEntity}
                />
              </div>
            </div>

            {/* Relationship Details */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Entity Relationships</h3>
              <div className="space-y-4">
                {relationships.slice(0, 10).map((rel) => {
                  const sourceEntity = entities.find(e => e.id === rel.source);
                  const targetEntity = entities.find(e => e.id === rel.target);
                  
                  return (
                    <div key={rel.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{sourceEntity?.name}</span>
                          <span className="text-gray-500">→</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {rel.type}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium text-gray-900">{targetEntity?.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {(rel.confidence * 100).toFixed(1)}% confidence
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Evidence:</strong> {rel.evidence[0] || 'No evidence available'}
                      </div>
                    </div>
                  );
                })}
                {relationships.length === 0 && (
                  <div className="text-center py-8">
                    <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No relationships extracted yet. Start crawling to discover entity relationships.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {entityTypes.map((type, index) => {
                const count = entities.filter(e => e.type === type).length;
                const colors = ['blue', 'green', 'purple', 'orange', 'red', 'cyan'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={type} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 bg-${color}-100 rounded-lg`}>
                        {type === 'satellite' && <Satellite className={`w-6 h-6 text-${color}-600`} />}
                        {type === 'sensor' && <Eye className={`w-6 h-6 text-${color}-600`} />}
                        {type === 'data_product' && <Database className={`w-6 h-6 text-${color}-600`} />}
                        {type === 'location' && <MapPin className={`w-6 h-6 text-${color}-600`} />}
                        {type === 'organization' && <Network className={`w-6 h-6 text-${color}-600`} />}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                        <div className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Graph Metrics */}
            {graphMetrics && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Knowledge Graph Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600 mb-2">{graphMetrics.nodeCount}</div>
                    <div className="text-sm text-gray-600">Total Nodes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{graphMetrics.edgeCount}</div>
                    <div className="text-sm text-gray-600">Total Edges</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{(graphMetrics.density * 100).toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Graph Density</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">{graphMetrics.avgDegree.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Avg Degree</div>
                  </div>
                </div>
              </div>
            )}

            {/* NLP Statistics */}
            {entities.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">NLP Processing Statistics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Entity Confidence Distribution</h4>
                    <div className="space-y-3">
                      {entityTypes.map(type => {
                        const typeEntities = entities.filter(e => e.type === type);
                        const avgConfidence = typeEntities.length > 0 
                          ? typeEntities.reduce((sum, e) => sum + e.confidence, 0) / typeEntities.length 
                          : 0;
                        
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                              <span className="text-sm font-medium text-gray-900">{(avgConfidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full" 
                                style={{ width: `${avgConfidence * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Processing Summary</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Documents Processed</span>
                        <span className="text-sm font-medium text-gray-900">{crawlResults.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Entities</span>
                        <span className="text-sm font-medium text-gray-900">{entities.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Relationships</span>
                        <span className="text-sm font-medium text-gray-900">{relationships.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg Entity Confidence</span>
                        <span className="text-sm font-medium text-gray-900">
                          {entities.length > 0 
                            ? ((entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length) * 100).toFixed(1) + '%'
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Interactive Graph Visualization Component
const GraphVisualization: React.FC<{
  entities: Entity[];
  relationships: Relationship[];
  searchQuery: string;
  onNodeClick: (entity: Entity) => void;
}> = ({ entities, relationships, searchQuery, onNodeClick }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [layout, setLayout] = useState<'force' | 'circular' | 'hierarchical'>('force');

  const getNodePosition = (entity: Entity, index: number, total: number) => {
    const centerX = 400;
    const centerY = 200;
    const radius = 150;

    switch (layout) {
      case 'circular':
        const angle = (index / total) * 2 * Math.PI;
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      case 'hierarchical':
        const typeGroups = entities.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const typeIndex = Object.keys(typeGroups).indexOf(entity.type);
        const entityIndexInType = entities.filter(e => e.type === entity.type).indexOf(entity);
        return {
          x: 100 + typeIndex * 150,
          y: 100 + entityIndexInType * 60
        };
      default: // force
        return {
          x: centerX + (Math.random() - 0.5) * 300,
          y: centerY + (Math.random() - 0.5) * 200
        };
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'satellite': return '#3B82F6';
      case 'sensor': return '#10B981';
      case 'data_product': return '#8B5CF6';
      case 'location': return '#F59E0B';
      case 'organization': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const isHighlighted = (entity: Entity) => {
    if (!searchQuery) return false;
    return entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           entity.type.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const getConnectedEntities = (entityId: string) => {
    const connected = new Set<string>();
    relationships.forEach(rel => {
      if (rel.source === entityId) connected.add(rel.target);
      if (rel.target === entityId) connected.add(rel.source);
    });
    return connected;
  };

  if (entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h4>
          <p className="text-gray-600">
            Start crawling to build the knowledge graph
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96">
      {/* Layout Controls */}
      <div className="absolute top-4 right-4 z-10">
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value as any)}
          className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
        >
          <option value="force">Force Layout</option>
          <option value="circular">Circular Layout</option>
          <option value="hierarchical">Hierarchical Layout</option>
        </select>
      </div>

      {/* Graph Stats */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg p-3 shadow-sm border">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-indigo-600">{entities.length}</div>
            <div className="text-xs text-gray-600">Entities</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">{relationships.length}</div>
            <div className="text-xs text-gray-600">Relationships</div>
          </div>
        </div>
      </div>

      {/* SVG Graph */}
      <svg className="w-full h-full">
        {/* Render relationships as lines */}
        {relationships.map((rel, index) => {
          const sourceEntity = entities.find(e => e.id === rel.source);
          const targetEntity = entities.find(e => e.id === rel.target);
          if (!sourceEntity || !targetEntity) return null;

          const sourcePos = getNodePosition(sourceEntity, entities.indexOf(sourceEntity), entities.length);
          const targetPos = getNodePosition(targetEntity, entities.indexOf(targetEntity), entities.length);

          const isConnectedToSelected = selectedNode && (rel.source === selectedNode || rel.target === selectedNode);

          return (
            <line
              key={rel.id}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke={isConnectedToSelected ? '#4F46E5' : '#D1D5DB'}
              strokeWidth={isConnectedToSelected ? 2 : 1}
              opacity={selectedNode && !isConnectedToSelected ? 0.3 : 0.6}
            />
          );
        })}

        {/* Render entities as circles */}
        {entities.map((entity, index) => {
          const position = getNodePosition(entity, index, entities.length);
          const isSelected = selectedNode === entity.id;
          const isHovered = hoveredNode === entity.id;
          const highlighted = isHighlighted(entity);
          const connected = selectedNode ? getConnectedEntities(selectedNode) : new Set();
          const isConnected = selectedNode && (selectedNode === entity.id || connected.has(entity.id));

          const radius = isSelected ? 12 : isHovered ? 10 : highlighted ? 9 : 7;
          const opacity = selectedNode && !isConnected ? 0.3 : 1;

          return (
            <g key={entity.id}>
              {/* Node circle */}
              <circle
                cx={position.x}
                cy={position.y}
                r={radius}
                fill={getNodeColor(entity.type)}
                opacity={opacity}
                stroke={highlighted ? '#4F46E5' : isSelected ? '#1F2937' : 'white'}
                strokeWidth={highlighted ? 3 : isSelected ? 2 : 1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredNode(entity.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  setSelectedNode(selectedNode === entity.id ? null : entity.id);
                  onNodeClick(entity);
                }}
              />
              
              {/* Node label */}
              <text
                x={position.x}
                y={position.y + radius + 15}
                textAnchor="middle"
                className="text-xs font-medium fill-gray-700 pointer-events-none"
                opacity={opacity}
              >
                {entity.name.length > 12 ? entity.name.substring(0, 12) + '...' : entity.name}
              </text>
              
              {/* Type indicator */}
              <text
                x={position.x}
                y={position.y + radius + 28}
                textAnchor="middle"
                className="text-xs fill-gray-500 pointer-events-none"
                opacity={opacity * 0.8}
              >
                {entity.type.replace('_', ' ')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-sm border">
        <div className="text-xs font-medium text-gray-900 mb-2">Entity Types</div>
        <div className="space-y-1">
          {[...new Set(entities.map(e => e.type))].map(type => (
            <div key={type} className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: getNodeColor(type) }}
              ></div>
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;