import React, { useState, useEffect } from 'react';
import queryEngine, { QueryResult, QueryIntent, SpatialMatch } from '../services/queryEngine';
import { Entity, Relationship } from '../services/nlpService';
import { GraphData } from '../services/graphService';
import { 
  Search, 
  MapPin, 
  Clock, 
  Satellite, 
  Database, 
  Eye, 
  Network,
  Lightbulb,
  ArrowRight,
  Globe,
  Filter,
  Zap,
  MessageCircle,
  Send,
  Loader
} from 'lucide-react';

interface QueryInterfaceProps {
  entities: Entity[];
  relationships: Relationship[];
  graphData: GraphData;
}

const QueryInterface: React.FC<QueryInterfaceProps> = ({ entities, relationships, graphData }) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sample queries for demonstration
  const sampleQueries = [
    "Show me all available datasets for the Mumbai metropolitan region",
    "What recent satellite imagery covers the state of Kerala?",
    "Which satellites carry LISS-IV sensors?",
    "Find DEM data products for Karnataka",
    "What data is available for coastal monitoring in Gujarat?",
    "Show relationships between Cartosat and data products"
  ];

  useEffect(() => {
    // Update query engine with current knowledge base
    queryEngine.updateKnowledgeBase(entities, relationships, graphData);
  }, [entities, relationships, graphData]);

  const handleQuery = async (queryText: string = query) => {
    if (!queryText.trim()) return;

    setIsProcessing(true);
    try {
      const result = await queryEngine.processQuery(queryText);
      setResults(result);
      
      // Add to history
      if (!queryHistory.includes(queryText)) {
        setQueryHistory(prev => [queryText, ...prev.slice(0, 9)]); // Keep last 10
      }
    } catch (error) {
      console.error('Query processing error:', error);
      setResults({
        entities: [],
        relationships: [],
        spatialMatches: [],
        confidence: 0,
        explanation: 'Error processing query. Please try again.',
        suggestions: ['Try a simpler query', 'Check your spelling', 'Use specific entity names']
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'satellite': return Satellite;
      case 'sensor': return Eye;
      case 'data_product': return Database;
      case 'location': return MapPin;
      default: return Network;
    }
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'satellite': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'sensor': return 'bg-green-100 text-green-600 border-green-200';
      case 'data_product': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'location': return 'bg-orange-100 text-orange-600 border-orange-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const SpatialMatchCard: React.FC<{ match: SpatialMatch }> = ({ match }) => {
    const Icon = getEntityIcon(match.entity.type);
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${getEntityColor(match.entity.type)}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{(match.confidence * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
        </div>
        
        <h4 className="font-medium text-gray-900 mb-2">{match.entity.name}</h4>
        <div className="text-sm text-gray-600 mb-2">
          <span className="capitalize">{match.spatialRelation}</span> {match.location}
        </div>
        
        {match.metadata.coverage && (
          <div className="text-xs text-gray-500 mb-1">
            Coverage: {match.metadata.coverage}
          </div>
        )}
        
        {match.metadata.resolution && (
          <div className="text-xs text-gray-500 mb-1">
            Resolution: {match.metadata.resolution}
          </div>
        )}
        
        <button
          onClick={() => setSelectedEntity(match.entity)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View Details →
        </button>
      </div>
    );
  };

  const EntityCard: React.FC<{ entity: Entity }> = ({ entity }) => {
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

  const RelationshipCard: React.FC<{ relationship: Relationship }> = ({ relationship }) => {
    const sourceEntity = entities.find(e => e.id === relationship.source);
    const targetEntity = entities.find(e => e.id === relationship.target);
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="font-medium text-gray-900">{sourceEntity?.name}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
              {relationship.type.replace('_', ' ')}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{targetEntity?.name}</span>
          </div>
          <span className="text-sm text-gray-500">
            {(relationship.confidence * 100).toFixed(1)}%
          </span>
        </div>
        
        {relationship.evidence[0] && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
            <strong>Evidence:</strong> {relationship.evidence[0]}
          </div>
        )}
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
              <MessageCircle className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Intelligent Query Engine</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {entities.length} entities • {relationships.length} relationships
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Query Input */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ask About MOSDAC Data</h3>
          
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about satellites, sensors, data products, or locations..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={() => handleQuery()}
              disabled={isProcessing || !query.trim()}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Sample Queries */}
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Try these example queries:</div>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.slice(0, 3).map((sampleQuery, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(sampleQuery);
                    handleQuery(sampleQuery);
                  }}
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {sampleQuery}
                </button>
              ))}
            </div>
          </div>

          {/* Query History */}
          {queryHistory.length > 0 && (
            <div>
              <div className="text-sm text-gray-600 mb-2">Recent queries:</div>
              <div className="flex flex-wrap gap-2">
                {queryHistory.slice(0, 5).map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(historyQuery);
                      handleQuery(historyQuery);
                    }}
                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    {historyQuery.length > 50 ? historyQuery.substring(0, 50) + '...' : historyQuery}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Query Results</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Confidence: {(results.confidence * 100).toFixed(1)}%
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    results.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                    results.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {results.confidence > 0.8 ? 'High' : results.confidence > 0.6 ? 'Medium' : 'Low'}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{results.explanation}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.entities.length}</div>
                  <div className="text-sm text-blue-700">Entities Found</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.relationships.length}</div>
                  <div className="text-sm text-green-700">Relationships</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{results.spatialMatches.length}</div>
                  <div className="text-sm text-purple-700">Spatial Matches</div>
                </div>
              </div>
            </div>

            {/* Spatial Matches */}
            {results.spatialMatches.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                  Geospatial Matches
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.spatialMatches.map((match, index) => (
                    <SpatialMatchCard key={index} match={match} />
                  ))}
                </div>
              </div>
            )}

            {/* Entities */}
            {results.entities.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Database className="w-5 h-5 mr-2 text-blue-500" />
                  Relevant Entities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.entities.slice(0, 12).map((entity) => (
                    <EntityCard key={entity.id} entity={entity} />
                  ))}
                </div>
                {results.entities.length > 12 && (
                  <div className="mt-4 text-center">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                      Show {results.entities.length - 12} more entities →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Relationships */}
            {results.relationships.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Network className="w-5 h-5 mr-2 text-green-500" />
                  Entity Relationships
                </h3>
                <div className="space-y-4">
                  {results.relationships.slice(0, 8).map((relationship) => (
                    <RelationshipCard key={relationship.id} relationship={relationship} />
                  ))}
                </div>
                {results.relationships.length > 8 && (
                  <div className="mt-4 text-center">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                      Show {results.relationships.length - 8} more relationships →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions */}
            {results.suggestions.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                  Suggestions
                </h3>
                <div className="space-y-2">
                  {results.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="bg-yellow-100 rounded-full p-1 mt-1">
                        <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                      </div>
                      <div className="text-gray-700">{suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {results.entities.length === 0 && results.spatialMatches.length === 0 && (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600 mb-4">
                  We couldn't find any entities or relationships matching your query.
                </p>
                <div className="space-y-2">
                  {results.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-sm text-gray-600">• {suggestion}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Entity Details Modal */}
        {selectedEntity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Entity Details</h3>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryInterface;