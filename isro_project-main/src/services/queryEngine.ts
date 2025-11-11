import nlp from 'compromise';
import { Entity, Relationship } from './nlpService';
import { GraphData, GraphNode, GraphEdge } from './graphService';

export interface QueryIntent {
  type: 'search' | 'filter' | 'relationship' | 'geospatial' | 'temporal' | 'comparison';
  entities: string[];
  locations: string[];
  timeframe?: {
    start?: Date;
    end?: Date;
    relative?: string; // 'recent', 'latest', 'past year'
  };
  spatialScope?: {
    type: 'point' | 'region' | 'state' | 'country';
    name: string;
    coordinates?: [number, number];
    bounds?: [[number, number], [number, number]];
  };
  dataTypes: string[];
  relationships: string[];
  confidence: number;
}

export interface QueryResult {
  entities: Entity[];
  relationships: Relationship[];
  spatialMatches: SpatialMatch[];
  confidence: number;
  explanation: string;
  suggestions: string[];
}

export interface SpatialMatch {
  entity: Entity;
  location: string;
  spatialRelation: 'covers' | 'within' | 'intersects' | 'near';
  confidence: number;
  metadata: {
    coverage?: string;
    resolution?: string;
    acquisitionDate?: Date;
  };
}

class QueryEngine {
  private entities: Entity[] = [];
  private relationships: Relationship[] = [];
  private graphData: GraphData = { nodes: [], edges: [] };
  
  // Geospatial knowledge base
  private spatialEntities = new Map<string, {
    type: 'state' | 'city' | 'region' | 'district';
    coordinates: [number, number];
    bounds: [[number, number], [number, number]];
    aliases: string[];
  }>();

  // Intent patterns for different query types
  private intentPatterns = {
    geospatial: [
      /(?:show|find|get|list)\s+.*(?:for|in|over|covering)\s+([\w\s]+?)(?:\s|$)/gi,
      /(?:datasets?|imagery|data)\s+.*(?:for|in|over|covering)\s+([\w\s]+?)(?:\s|$)/gi,
      /(?:what|which)\s+.*(?:covers?|available)\s+.*?([\w\s]+?)(?:\s|$)/gi
    ],
    temporal: [
      /(?:recent|latest|new|current)\s+/gi,
      /(?:from|since|after|before)\s+(\d{4}|\w+\s+\d{4})/gi,
      /(?:past|last)\s+(\d+)\s+(years?|months?|days?)/gi
    ],
    dataType: [
      /(?:satellite|imagery|images?)/gi,
      /(?:datasets?|data)/gi,
      /(?:DEM|elevation)/gi,
      /(?:LULC|land\s+use)/gi,
      /(?:NDVI|vegetation)/gi
    ],
    relationship: [
      /(?:carries|equipped\s+with|has)/gi,
      /(?:provides|generates|produces)/gi,
      /(?:used\s+for|utilized\s+for)/gi
    ]
  };

  constructor() {
    this.initializeSpatialKnowledge();
  }

  private initializeSpatialKnowledge() {
    // Indian states and major cities with approximate coordinates
    const spatialData = [
      {
        name: 'Mumbai',
        type: 'city' as const,
        coordinates: [72.8777, 19.0760] as [number, number],
        bounds: [[72.7, 18.9], [73.0, 19.3]] as [[number, number], [number, number]],
        aliases: ['mumbai', 'bombay', 'mumbai metropolitan region', 'mmr']
      },
      {
        name: 'Kerala',
        type: 'state' as const,
        coordinates: [76.2711, 10.8505] as [number, number],
        bounds: [[74.8, 8.2], [77.4, 12.8]] as [[number, number], [number, number]],
        aliases: ['kerala', 'kerala state']
      },
      {
        name: 'Delhi',
        type: 'city' as const,
        coordinates: [77.1025, 28.7041] as [number, number],
        bounds: [[76.8, 28.4], [77.3, 28.9]] as [[number, number], [number, number]],
        aliases: ['delhi', 'new delhi', 'ncr', 'national capital region']
      },
      {
        name: 'Karnataka',
        type: 'state' as const,
        coordinates: [75.7139, 15.3173] as [number, number],
        bounds: [[74.0, 11.5], [78.6, 18.5]] as [[number, number], [number, number]],
        aliases: ['karnataka', 'karnataka state']
      },
      {
        name: 'Tamil Nadu',
        type: 'state' as const,
        coordinates: [78.6569, 11.1271] as [number, number],
        bounds: [[76.2, 8.0], [80.3, 13.6]] as [[number, number], [number, number]],
        aliases: ['tamil nadu', 'tamilnadu', 'tn']
      },
      {
        name: 'Rajasthan',
        type: 'state' as const,
        coordinates: [74.2179, 27.0238] as [number, number],
        bounds: [[69.5, 23.0], [78.2, 30.2]] as [[number, number], [number, number]],
        aliases: ['rajasthan', 'rajasthan state']
      },
      {
        name: 'Gujarat',
        type: 'state' as const,
        coordinates: [71.1924, 22.2587] as [number, number],
        bounds: [[68.2, 20.1], [74.5, 24.7]] as [[number, number], [number, number]],
        aliases: ['gujarat', 'gujarat state']
      },
      {
        name: 'West Bengal',
        type: 'state' as const,
        coordinates: [87.8550, 22.9868] as [number, number],
        bounds: [[85.8, 21.5], [89.9, 27.2]] as [[number, number], [number, number]],
        aliases: ['west bengal', 'bengal', 'wb']
      }
    ];

    spatialData.forEach(location => {
      this.spatialEntities.set(location.name.toLowerCase(), location);
      location.aliases.forEach(alias => {
        this.spatialEntities.set(alias.toLowerCase(), location);
      });
    });
  }

  updateKnowledgeBase(entities: Entity[], relationships: Relationship[], graphData: GraphData) {
    this.entities = entities;
    this.relationships = relationships;
    this.graphData = graphData;
    console.log(`Query engine updated with ${entities.length} entities and ${relationships.length} relationships`);
  }

  async processQuery(query: string): Promise<QueryResult> {
    console.log(`Processing query: "${query}" with ${this.entities.length} entities available`);
    
    // Parse and understand the query
    const intent = await this.parseIntent(query);
    
    // Execute the query based on intent
    const results = await this.executeQuery(intent, query);
    
    console.log(`Query results: ${results.entities.length} entities, ${results.relationships.length} relationships, confidence: ${results.confidence}`);
    
    return results;
  }

  private async parseIntent(query: string): Promise<QueryIntent> {
    const doc = nlp(query);
    const lowerQuery = query.toLowerCase();
    
    let intent: QueryIntent = {
      type: 'search',
      entities: [],
      locations: [],
      dataTypes: [],
      relationships: [],
      confidence: 0.5
    };

    // Enhanced intent detection with better pattern matching
    let intentScore = 0;
    
    // Detect query type
    if (this.intentPatterns.geospatial.some(pattern => pattern.test(query))) {
      intent.type = 'geospatial';
      intentScore += 0.4;
    }

    if (this.intentPatterns.temporal.some(pattern => pattern.test(query))) {
      if (intent.type === 'geospatial') {
        intent.type = 'temporal'; // Combined temporal-geospatial
      } else {
        intent.type = 'temporal';
      }
      intentScore += 0.3;
    }

    // Check for relationship queries
    if (this.intentPatterns.relationship.some(pattern => pattern.test(query))) {
      intent.type = 'relationship';
      intentScore += 0.3;
    }

    // Extract locations
    const places = doc.places().out('array');
    intent.locations = places;

    // Check for known spatial entities
    for (const [key, spatialEntity] of this.spatialEntities.entries()) {
      if (lowerQuery.includes(key)) {
        if (!intent.locations.includes(spatialEntity.name)) {
          intent.locations.push(spatialEntity.name);
        }
        intent.spatialScope = {
          type: spatialEntity.type === 'city' ? 'point' : 'region',
          name: spatialEntity.name,
          coordinates: spatialEntity.coordinates,
          bounds: spatialEntity.bounds
        };
        intentScore += 0.4;
      }
    }

    // Extract data types
    this.intentPatterns.dataType.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        intent.dataTypes.push(...matches.map(m => m.toLowerCase()));
        intentScore += 0.3;
      }
    });

    // Extract temporal information
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest')) {
      intent.timeframe = { relative: 'recent' };
      intentScore += 0.3;
    }
    
    // Extract specific years or dates
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const yearMatches = query.match(yearPattern);
    if (yearMatches) {
      intent.timeframe = {
        start: new Date(`${yearMatches[0]}-01-01`),
        end: new Date(`${yearMatches[0]}-12-31`)
      };
      intentScore += 0.3;
    }

    // Extract entities mentioned in query
    const queryWords = lowerQuery.split(' ').filter(word => word.length > 2);
    const entityMatches = this.entities.filter(entity => {
      const entityNameLower = entity.name.toLowerCase();
      return queryWords.some(word => 
        entityNameLower.includes(word) || word.includes(entityNameLower)
      ) || lowerQuery.includes(entityNameLower);
    });
    intent.entities = entityMatches.map(e => e.name);
    
    if (entityMatches.length > 0) {
      intentScore += 0.2 * Math.min(entityMatches.length, 3);
    }

    // Set final confidence
    intent.confidence = Math.min(intentScore, 1.0);

    return intent;
  }

  private async executeQuery(intent: QueryIntent, originalQuery: string): Promise<QueryResult> {
    let results: QueryResult = {
      entities: [],
      relationships: [],
      spatialMatches: [],
      confidence: intent.confidence,
      explanation: '',
      suggestions: []
    };

    // Enhanced query execution with combined approaches
    const combinedResults: QueryResult[] = [];
    
    switch (intent.type) {
      case 'geospatial':
        combinedResults.push(await this.executeGeospatialQuery(intent, originalQuery));
        break;
      case 'temporal':
        combinedResults.push(await this.executeTemporalQuery(intent, originalQuery));
        // Also include spatial if location is mentioned
        if (intent.locations.length > 0) {
          combinedResults.push(await this.executeGeospatialQuery(intent, originalQuery));
        }
        break;
      case 'relationship':
        combinedResults.push(await this.executeRelationshipQuery(intent, originalQuery));
        break;
      default:
        combinedResults.push(await this.executeSemanticSearch(intent, originalQuery));
        // Also try other approaches if semantic search has low confidence
        if (intent.confidence < 0.6) {
          if (intent.locations.length > 0) {
            combinedResults.push(await this.executeGeospatialQuery(intent, originalQuery));
          }
          if (intent.entities.length > 0) {
            combinedResults.push(await this.executeRelationshipQuery(intent, originalQuery));
          }
        }
    }
    
    // Combine results intelligently
    if (combinedResults.length === 1) {
      results = combinedResults[0];
    } else {
      results = this.combineQueryResults(combinedResults, intent);
    }

    // Generate suggestions
    results.suggestions = this.generateSuggestions(intent, results);

    return results;
  }

  private async executeGeospatialQuery(intent: QueryIntent, query: string): Promise<QueryResult> {
    const spatialMatches: SpatialMatch[] = [];
    const relevantEntities: Entity[] = [];
    const relevantRelationships: Relationship[] = [];

    // Find entities with spatial relevance
    if (intent.spatialScope) {
      const locationName = intent.spatialScope.name.toLowerCase();
      
      // Search for entities that mention the location
      this.entities.forEach(entity => {
        const mentionsLocation = entity.mentions.some(mention => 
          mention.context.toLowerCase().includes(locationName) ||
          mention.text.toLowerCase().includes(locationName)
        );

        if (mentionsLocation || entity.attributes.coverage?.toLowerCase().includes(locationName)) {
          relevantEntities.push(entity);
          
          // Create spatial match
          spatialMatches.push({
            entity,
            location: intent.spatialScope!.name,
            spatialRelation: 'covers',
            confidence: 0.8,
            metadata: {
              coverage: entity.attributes.coverage || 'Unknown',
              resolution: entity.attributes.resolution || 'Unknown',
              acquisitionDate: entity.attributes.acquisitionDate
            }
          });
        }
      });

      // Find relationships involving spatial entities
      relevantRelationships.push(...this.relationships.filter(rel => {
        const sourceEntity = this.entities.find(e => e.id === rel.source);
        const targetEntity = this.entities.find(e => e.id === rel.target);
        
        return relevantEntities.includes(sourceEntity!) || relevantEntities.includes(targetEntity!);
      }));
    }

    // Filter by data types if specified
    if (intent.dataTypes.length > 0) {
      const filteredEntities = relevantEntities.filter(entity => 
        intent.dataTypes.some(dataType => 
          entity.type.includes(dataType) || 
          entity.name.toLowerCase().includes(dataType) ||
          entity.attributes.productType?.toLowerCase().includes(dataType)
        )
      );
      relevantEntities.splice(0, relevantEntities.length, ...filteredEntities);
    }

    return {
      entities: relevantEntities,
      relationships: relevantRelationships,
      spatialMatches,
      confidence: 0.85,
      explanation: `Found ${relevantEntities.length} entities and ${spatialMatches.length} spatial matches for ${intent.spatialScope?.name || 'the specified location'}.`,
      suggestions: []
    };
  }

  private async executeTemporalQuery(intent: QueryIntent, query: string): Promise<QueryResult> {
    const relevantEntities: Entity[] = [];
    const relevantRelationships: Relationship[] = [];

    // Filter entities by temporal criteria
    if (intent.timeframe?.relative === 'recent') {
      // Sort by acquisition date or last update
      const sortedEntities = this.entities
        .filter(entity => entity.attributes.acquisitionDate || entity.mentions.length > 0)
        .sort((a, b) => {
          const dateA = new Date(a.attributes.acquisitionDate || a.mentions[0]?.sourceUrl || 0);
          const dateB = new Date(b.attributes.acquisitionDate || b.mentions[0]?.sourceUrl || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 20); // Top 20 most recent

      relevantEntities.push(...sortedEntities);
    }

    // Find related relationships
    relevantRelationships.push(...this.relationships.filter(rel => {
      const sourceEntity = this.entities.find(e => e.id === rel.source);
      const targetEntity = this.entities.find(e => e.id === rel.target);
      
      return relevantEntities.includes(sourceEntity!) || relevantEntities.includes(targetEntity!);
    }));

    return {
      entities: relevantEntities,
      relationships: relevantRelationships,
      spatialMatches: [],
      confidence: 0.75,
      explanation: `Found ${relevantEntities.length} recent entities based on temporal criteria.`,
      suggestions: []
    };
  }

  private async executeRelationshipQuery(intent: QueryIntent, query: string): Promise<QueryResult> {
    const relevantRelationships: Relationship[] = [];
    const relevantEntities: Entity[] = [];

    // Find relationships based on query patterns
    this.relationships.forEach(rel => {
      const matchesPattern = intent.relationships.some(pattern => 
        rel.type.includes(pattern) || rel.evidence.some(evidence => 
          evidence.toLowerCase().includes(pattern)
        )
      );

      if (matchesPattern) {
        relevantRelationships.push(rel);
        
        // Add related entities
        const sourceEntity = this.entities.find(e => e.id === rel.source);
        const targetEntity = this.entities.find(e => e.id === rel.target);
        
        if (sourceEntity && !relevantEntities.includes(sourceEntity)) {
          relevantEntities.push(sourceEntity);
        }
        if (targetEntity && !relevantEntities.includes(targetEntity)) {
          relevantEntities.push(targetEntity);
        }
      }
    });

    return {
      entities: relevantEntities,
      relationships: relevantRelationships,
      spatialMatches: [],
      confidence: 0.8,
      explanation: `Found ${relevantRelationships.length} relationships matching the query pattern.`,
      suggestions: []
    };
  }

  private async executeSemanticSearch(intent: QueryIntent, query: string): Promise<QueryResult> {
    const relevantEntities: Entity[] = [];
    const relevantRelationships: Relationship[] = [];
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);

    // Semantic similarity scoring
    this.entities.forEach(entity => {
      let score = 0;
      
      // Name similarity
      if (queryTerms.some(term => entity.name.toLowerCase().includes(term))) {
        score += 0.4;
      }
      
      // Type similarity
      if (queryTerms.some(term => entity.type.includes(term))) {
        score += 0.3;
      }
      
      // Context similarity
      const contextText = entity.mentions.map(m => m.context).join(' ').toLowerCase();
      const contextMatches = queryTerms.filter(term => contextText.includes(term)).length;
      score += (contextMatches / queryTerms.length) * 0.3;
      
      if (score > 0.3) {
        relevantEntities.push(entity);
      }
    });

    // Find related relationships
    relevantRelationships.push(...this.relationships.filter(rel => {
      const sourceEntity = this.entities.find(e => e.id === rel.source);
      const targetEntity = this.entities.find(e => e.id === rel.target);
      
      return relevantEntities.includes(sourceEntity!) || relevantEntities.includes(targetEntity!);
    }));

    return {
      entities: relevantEntities.slice(0, 50), // Limit results
      relationships: relevantRelationships,
      spatialMatches: [],
      confidence: 0.7,
      explanation: `Found ${relevantEntities.length} entities through semantic search.`,
      suggestions: []
    };
  }

  private generateSuggestions(intent: QueryIntent, results: QueryResult): string[] {
    const suggestions: string[] = [];

    if (results.entities.length === 0) {
      suggestions.push("Try using more specific terms like 'Cartosat', 'RISAT', or 'LISS-IV'");
      suggestions.push("Include location names like 'Mumbai', 'Kerala', or 'Delhi'");
      suggestions.push("Specify data types like 'satellite imagery', 'DEM', or 'LULC'");
    }

    if (intent.type === 'geospatial' && results.spatialMatches.length === 0) {
      suggestions.push("Try broader location terms like state names instead of specific cities");
      suggestions.push("Check if the location is covered by ISRO satellite missions");
    }

    if (intent.locations.length === 0 && intent.type !== 'geospatial') {
      suggestions.push("Add location context: 'for Mumbai region' or 'covering Kerala'");
    }

    // Entity-specific suggestions
    const entityTypes = [...new Set(results.entities.map(e => e.type))];
    if (entityTypes.length > 0) {
      suggestions.push(`Explore related ${entityTypes.join(', ')} entities`);
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  // Combine multiple query results intelligently
  private combineQueryResults(results: QueryResult[], intent: QueryIntent): QueryResult {
    const combined: QueryResult = {
      entities: [],
      relationships: [],
      spatialMatches: [],
      confidence: 0,
      explanation: '',
      suggestions: []
    };
    
    // Combine entities (remove duplicates)
    const entityIds = new Set<string>();
    results.forEach(result => {
      result.entities.forEach(entity => {
        if (!entityIds.has(entity.id)) {
          entityIds.add(entity.id);
          combined.entities.push(entity);
        }
      });
    });
    
    // Combine relationships (remove duplicates)
    const relationshipIds = new Set<string>();
    results.forEach(result => {
      result.relationships.forEach(rel => {
        if (!relationshipIds.has(rel.id)) {
          relationshipIds.add(rel.id);
          combined.relationships.push(rel);
        }
      });
    });
    
    // Combine spatial matches
    results.forEach(result => {
      combined.spatialMatches.push(...result.spatialMatches);
    });
    
    // Calculate combined confidence (weighted average)
    const totalWeight = results.reduce((sum, r) => sum + (r.entities.length + r.relationships.length + r.spatialMatches.length), 0);
    if (totalWeight > 0) {
      combined.confidence = results.reduce((sum, r) => {
        const weight = r.entities.length + r.relationships.length + r.spatialMatches.length;
        return sum + (r.confidence * weight);
      }, 0) / totalWeight;
    } else {
      combined.confidence = Math.max(...results.map(r => r.confidence));
    }
    
    // Generate combined explanation
    const resultCounts = results.map(r => ({
      entities: r.entities.length,
      relationships: r.relationships.length,
      spatial: r.spatialMatches.length
    }));
    
    combined.explanation = `Found ${combined.entities.length} entities, ${combined.relationships.length} relationships, and ${combined.spatialMatches.length} spatial matches through comprehensive analysis.`;
    
    return combined;
  }

  // Advanced query capabilities
  async findSpatiallyRelatedEntities(location: string, radius: number = 100): Promise<Entity[]> {
    const spatialEntity = this.spatialEntities.get(location.toLowerCase());
    if (!spatialEntity) return [];

    return this.entities.filter(entity => {
      // Check if entity mentions the location or nearby areas
      return entity.mentions.some(mention => 
        mention.context.toLowerCase().includes(location.toLowerCase())
      ) || entity.attributes.coverage?.toLowerCase().includes(location.toLowerCase());
    });
  }

  async findTemporallyRelatedEntities(timeframe: { start: Date; end: Date }): Promise<Entity[]> {
    return this.entities.filter(entity => {
      const entityDate = new Date(entity.attributes.acquisitionDate || 0);
      return entityDate >= timeframe.start && entityDate <= timeframe.end;
    });
  }

  async explainRelationship(sourceId: string, targetId: string): Promise<string> {
    const relationship = this.relationships.find(rel => 
      (rel.source === sourceId && rel.target === targetId) ||
      (rel.source === targetId && rel.target === sourceId)
    );

    if (!relationship) return "No direct relationship found.";

    const sourceEntity = this.entities.find(e => e.id === relationship.source);
    const targetEntity = this.entities.find(e => e.id === relationship.target);

    return `${sourceEntity?.name} ${relationship.type.replace('_', ' ')} ${targetEntity?.name}. Evidence: ${relationship.evidence[0] || 'No evidence available'}.`;
  }
}

export default new QueryEngine();