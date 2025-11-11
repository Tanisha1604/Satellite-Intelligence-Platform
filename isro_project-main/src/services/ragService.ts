import { Entity, Relationship } from './nlpService';
import { GraphData } from './graphService';
import queryEngine, { QueryResult } from './queryEngine';
import evaluationService from './evaluationService';
import localDatabase from './localDatabase';
import { FAQItem } from './faqService';
import lyzrService from './lyzrService';
import realAnalyticsService from './realAnalyticsService';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    queryResult?: QueryResult;
    confidence?: number;
    sources?: string[];
    fallbackReason?: string;
  };
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  currentTopic?: string;
  userIntent?: string;
  spatialContext?: string;
  temporalContext?: string;
}

export interface RAGResponse {
  response: string;
  confidence: number;
  sources: string[];
  relatedEntities: Entity[];
  suggestedQuestions: string[];
  requiresHumanEscalation: boolean;
  fallbackReason?: string;
  queryResult?: QueryResult;
  faqMatches?: FAQItem[];
}

class RAGService {
  private conversationHistory = new Map<string, ConversationContext>();
  private entities: Entity[] = [];
  private relationships: Relationship[] = [];
  private graphData: GraphData = { nodes: [], edges: [] };

  // Response templates for different scenarios
  private responseTemplates = {
    greeting: [
      "Hello! I'm your MOSDAC AI assistant. I can help you find information about satellites, sensors, data products, and geographic coverage. What would you like to know?",
      "Hi there! I'm here to help you explore MOSDAC's satellite data and missions. Feel free to ask about any satellite, sensor, or geographic region.",
      "Welcome! I can assist you with questions about ISRO satellites, remote sensing data, and geographic coverage. How can I help you today?"
    ],
    
    dataRequest: [
      "Based on the available data, here's what I found:",
      "I've searched through the MOSDAC knowledge base and found:",
      "Here are the relevant datasets and information:"
    ],
    
    spatialQuery: [
      "For the {location} region, I found the following satellite coverage:",
      "Here's what's available for {location}:",
      "The satellite data covering {location} includes:"
    ],
    
    noResults: [
      "I couldn't find specific information about that in the current knowledge base.",
      "That query didn't return any results from the available data.",
      "I don't have information about that particular topic in my current knowledge."
    ],
    
    clarification: [
      "Could you provide more details about what you're looking for?",
      "To help you better, could you specify:",
      "I'd like to understand your request better. Could you clarify:"
    ],
    
    fallback: [
      "I'm not able to provide a complete answer to that question. Let me connect you with a human expert who can help.",
      "This query is outside my current capabilities. I'll escalate this to a human specialist.",
      "For this type of complex query, I recommend speaking with one of our domain experts."
    ]
  };

  private generateSpatialResponse(query: string, spatialMatches: any[], entities: Entity[]): string {
    const location = spatialMatches[0]?.location || 'the specified region';
    let response = `**Geographic Coverage for ${location}**\n\n`;
    response += `I found ${spatialMatches.length} relevant dataset${spatialMatches.length !== 1 ? 's' : ''} covering this region:\n\n`;

    spatialMatches.slice(0, 5).forEach((match, index) => {
      response += `**${index + 1}. ${match.entity.name}**\n`;
      response += `   • Type: ${match.entity.type.replace('_', ' ')}\n`;
      response += `   • Coverage: ${match.spatialRelation} ${match.location}\n`;
      response += `   • Confidence: ${(match.confidence * 100).toFixed(1)}%\n`;
      
      if (match.metadata.coverage) {
        response += `   • Spatial Coverage: ${match.metadata.coverage}\n`;
      }
      if (match.metadata.resolution) {
        response += `   • Resolution: ${match.metadata.resolution}\n`;
      }
      response += '\n';
    });

    if (spatialMatches.length > 5) {
      response += `*And ${spatialMatches.length - 5} additional datasets available for this region.*\n\n`;
    }

    // Add contextual recommendations
    const satelliteTypes = [...new Set(spatialMatches.map(m => m.entity.type))];
    if (satelliteTypes.length > 1) {
      response += `**Available Data Types:** ${satelliteTypes.map(t => t.replace('_', ' ')).join(', ')}\n\n`;
    }
    
    response += `These datasets provide comprehensive coverage for ${location}. `;
    
    // Add smart suggestions based on data types
    if (spatialMatches.some(m => m.entity.type === 'satellite')) {
      response += `Would you like to know more about specific satellites, data products, or download procedures?`;
    } else {
      response += `Would you like more details about any specific dataset or sensor capabilities?`;
    }

    return response;
  }

  private generateEntityRelationshipResponse(entities: Entity[], relationships: Relationship[]): string {
    let response = `**Knowledge Base Analysis**\n\n`;
    response += `I discovered ${entities.length} relevant entit${entities.length !== 1 ? 'ies' : 'y'} and ${relationships.length} relationship${relationships.length !== 1 ? 's' : ''} in the MOSDAC knowledge base:\n\n`;

    // Highlight key entities
    response += "**🛰️ Key Entities:**\n";
    entities.slice(0, 5).forEach((entity, index) => {
      const typeIcon = this.getEntityTypeIcon(entity.type);
      response += `${typeIcon} **${entity.name}** (${entity.type.replace('_', ' ')})\n`;
      response += `   • Confidence: ${(entity.confidence * 100).toFixed(1)}%\n`;
      response += `   • Mentions: ${entity.mentions.length}\n`;
      response += `   • Sources: ${entity.sourceDocuments.length} document${entity.sourceDocuments.length !== 1 ? 's' : ''}\n`;
      
      // Add key attributes if available
      if (entity.attributes && Object.keys(entity.attributes).length > 0) {
        const keyAttrs = Object.entries(entity.attributes).slice(0, 2);
        keyAttrs.forEach(([key, value]) => {
          response += `   • ${key}: ${value}\n`;
        });
      }
      response += '\n';
    });

    // Highlight key relationships
    if (relationships.length > 0) {
      response += "**🔗 Key Relationships:**\n";
      relationships.slice(0, 3).forEach((rel, index) => {
        const sourceEntity = entities.find(e => e.id === rel.source);
        const targetEntity = entities.find(e => e.id === rel.target);
        
        if (sourceEntity && targetEntity) {
          response += `• ${sourceEntity.name} **${rel.type.replace('_', ' ')}** ${targetEntity.name}\n`;
          response += `  *Confidence: ${(rel.confidence * 100).toFixed(1)}%*\n`;
          if (rel.evidence[0]) {
            response += `  *Evidence: "${rel.evidence[0].substring(0, 80)}..."*\n`;
          }
          response += '\n';
        }
      });
    }

    // Add intelligent follow-up suggestions
    const entityTypes = [...new Set(entities.map(e => e.type))];
    response += "**💡 What would you like to explore next?**\n";
    
    if (entityTypes.includes('satellite')) {
      response += "• Learn about specific satellite capabilities\n";
    }
    if (entityTypes.includes('sensor')) {
      response += "• Discover sensor specifications and applications\n";
    }
    if (entityTypes.includes('location')) {
      response += "• Find more data for specific geographic regions\n";
    }
    if (relationships.length > 3) {
      response += "• Explore additional relationships in the knowledge graph\n";
    }

    return response;
  }

  private generateEntityResponse(entities: Entity[]): string {
    let response = `I found ${entities.length} relevant entit${entities.length !== 1 ? 'ies' : 'y'}:\n\n`;

    entities.slice(0, 8).forEach((entity, index) => {
      response += `${index + 1}. **${entity.name}** (${entity.type.replace('_', ' ')})\n`;
      response += `   - Confidence: ${(entity.confidence * 100).toFixed(1)}%\n`;
      response += `   - Mentions: ${entity.mentions.length}\n`;
      
      // Add key attributes if available
      if (entity.attributes.coverage) {
        response += `   - Coverage: ${entity.attributes.coverage}\n`;
      }
      if (entity.attributes.resolution) {
        response += `   - Resolution: ${entity.attributes.resolution}\n`;
      }
      response += '\n';
    });

    if (entities.length > 8) {
      response += `And ${entities.length - 8} more entities found.\n\n`;
    }

    response += "Would you like detailed information about any specific entity?";

    return response;
  }

  private generateRelationshipResponse(relationships: Relationship[]): string {
    let response = `I found ${relationships.length} relationship${relationships.length !== 1 ? 's' : ''} in the knowledge base:\n\n`;

    relationships.slice(0, 5).forEach((rel, index) => {
      const sourceEntity = this.entities.find(e => e.id === rel.source);
      const targetEntity = this.entities.find(e => e.id === rel.target);
      
      if (sourceEntity && targetEntity) {
        response += `${index + 1}. **${sourceEntity.name}** ${rel.type.replace('_', ' ')} **${targetEntity.name}**\n`;
        response += `   - Confidence: ${(rel.confidence * 100).toFixed(1)}%\n`;
        if (rel.evidence[0]) {
          response += `   - Evidence: "${rel.evidence[0].substring(0, 100)}..."\n`;
        }
        response += '\n';
      }
    });

    response += "These relationships show how different satellites, sensors, and data products are connected.";

    return response;
  }

  private generateNoResultsResponse(query: string): string {
    const suggestions = [
      "Try using specific satellite names like 'Cartosat-3' or 'RISAT-1A'",
      "Include location names like 'Mumbai', 'Kerala', or 'Delhi'",
      "Specify data types like 'satellite imagery', 'DEM', or 'LULC'",
      "Ask about sensor capabilities like 'LISS-IV' or 'SAR'"
    ];

    let response = "I couldn't find specific information matching your query in the current knowledge base.\n\n";
    response += "Here are some suggestions to help you find what you're looking for:\n\n";
    
    suggestions.forEach((suggestion, index) => {
      response += `${index + 1}. ${suggestion}\n`;
    });

    response += "\nWould you like to try rephrasing your question or would you prefer to speak with a human expert?";

    return response;
  }

  private generateFallbackResponse(query: string, queryResult: QueryResult): RAGResponse {
    const fallbackReasons = [];
    
    if (queryResult.confidence < 0.3) {
      fallbackReasons.push("Low confidence in query understanding");
    }
    if (queryResult.entities.length === 0) {
      fallbackReasons.push("No relevant entities found");
    }

    // Enhanced fallback with more helpful guidance
    let fallbackMessage = `I'm having some difficulty finding specific information about "${query}" in the current knowledge base.\n\n`;
    
    // Provide context-aware suggestions
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);
    const suggestions: string[] = [];
    
    // Check if query contains technical terms
    if (queryWords.some(word => ['satellite', 'sensor', 'data', 'imagery'].includes(word))) {
      suggestions.push("Try using specific satellite names like 'INSAT-3D', 'Cartosat-3', or 'Oceansat-2'");
    }
    
    // Check if query contains location terms
    if (queryWords.some(word => ['region', 'area', 'state', 'city', 'location'].includes(word))) {
      suggestions.push("Include specific location names like 'Mumbai', 'Kerala', or 'Delhi'");
    }
    
    // Check if query is too general
    if (queryWords.length < 3) {
      suggestions.push("Provide more specific details about what you're looking for");
    }
    
    // Default suggestions if none specific
    if (suggestions.length === 0) {
      suggestions.push(
        "Try using specific satellite names like 'Cartosat-3' or 'RISAT-1A'",
        "Include location names like 'Mumbai', 'Kerala', or 'Delhi'",
        "Specify data types like 'satellite imagery', 'DEM', or 'LULC'"
      );
    }
    
    fallbackMessage += "**Here are some suggestions to help you find what you're looking for:**\n\n";
    suggestions.slice(0, 3).forEach((suggestion, index) => {
      fallbackMessage += `${index + 1}. ${suggestion}\n`;
    });
    
    fallbackMessage += "\n**Example queries that work well:**\n";
    fallbackMessage += "• 'What satellites cover Mumbai region?'\n";
    fallbackMessage += "• 'Show me DEM data for Kerala'\n";
    fallbackMessage += "• 'Which sensors does Cartosat-3 carry?'\n";
    fallbackMessage += "• 'Find recent imagery for coastal areas'\n\n";
    
    fallbackMessage += "Would you like to try rephrasing your question, or would you prefer to speak with a human expert?";
    return {
      response: fallbackMessage,
      confidence: queryResult.confidence,
      sources: [],
      relatedEntities: [],
      suggestedQuestions: [
        "What satellites are available for monitoring urban areas?",
        "Show me data products for agricultural applications",
        "Which sensors are best for coastal monitoring?",
        "Find information about recent satellite launches"
      ],
      requiresHumanEscalation: true,
      fallbackReason: fallbackReasons.join(', ')
    };
  }

  private generateErrorResponse(): RAGResponse {
    return {
      response: "I'm experiencing technical difficulties processing your request. Please try again in a moment, or I can connect you with a human assistant for immediate help.",
      confidence: 0,
      sources: [],
      relatedEntities: [],
      suggestedQuestions: [
        "Try asking a simpler question",
        "Would you like to speak with a human assistant?",
        "Can you rephrase your request?"
      ],
      requiresHumanEscalation: true,
      fallbackReason: "Technical error in processing"
    };
  }

  private generateHelpResponse(): string {
    return `I'm your MOSDAC AI assistant! I can help you with:

**🛰️ Satellite Information**
- Find details about ISRO satellites (Cartosat, RISAT, ResourceSat, etc.)
- Learn about satellite missions and capabilities
- Discover launch dates and operational status

**📡 Sensor Data**
- Explore sensor specifications (LISS-IV, AWiFS, SAR, etc.)
- Understand sensor capabilities and applications
- Find technical specifications

**🗺️ Geographic Coverage**
- Find satellite data for specific regions
- Discover what imagery covers your area of interest
- Explore spatial datasets

**📊 Data Products**
- Learn about available data products (DEM, LULC, NDVI, etc.)
- Find processing levels and formats
- Understand data applications

**Examples of what you can ask:**
- "What satellites cover Mumbai?"
- "Show me DEM data for Kerala"
- "Which sensors does Cartosat-3 carry?"
- "Find recent imagery for coastal regions"

Just ask me anything about MOSDAC data and I'll help you find the information you need!`;
  }

  private extractSources(queryResult: QueryResult): string[] {
    const sources = new Set<string>();
    
    queryResult.entities.forEach(entity => {
      entity.sourceDocuments.forEach(doc => sources.add(doc));
    });
    
    queryResult.relationships.forEach(rel => {
      rel.sourceUrls.forEach(url => sources.add(url));
    });

    return Array.from(sources).slice(0, 5);
  }

  private generateSuggestedQuestions(queryResult: QueryResult): string[] {
    const suggestions: string[] = [];
    
    // Generate suggestions based on found entities
    if (queryResult.entities.length > 0) {
      const entity = queryResult.entities[0];
      suggestions.push(`Tell me more about ${entity.name}`);
      
      if (entity.type === 'satellite') {
        suggestions.push(`What sensors does ${entity.name} carry?`);
        suggestions.push(`What data products are available from ${entity.name}?`);
      }
      
      if (entity.type === 'location') {
        suggestions.push(`What other satellites cover ${entity.name}?`);
        suggestions.push(`Show me recent imagery for ${entity.name}`);
      }
    }

    // Generate suggestions based on spatial matches
    if (queryResult.spatialMatches.length > 0) {
      const location = queryResult.spatialMatches[0].location;
      suggestions.push(`What's the latest data for ${location}?`);
      suggestions.push(`Show me all sensors covering ${location}`);
    }

    // Add general suggestions if none specific
    if (suggestions.length === 0) {
      suggestions.push(
        "What satellites are currently operational?",
        "Show me data products for coastal monitoring",
        "Find information about LISS-IV sensor"
      );
    }

    return suggestions.slice(0, 3);
  }

  private getEntityTypeIcon(type: string): string {
    switch (type) {
      case 'satellite': return '🛰️';
      case 'sensor': return '📡';
      case 'data_product': return '📊';
      case 'location': return '📍';
      case 'organization': return '🏢';
      case 'mission': return '🚀';
      default: return '🔍';
    }
  }

  private getRandomTemplate(type: keyof typeof this.responseTemplates): string {
    const templates = this.responseTemplates[type];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Build comprehensive knowledge context for Lyzr AI
  private async buildComprehensiveKnowledgeContext(
    query: string, 
    queryResult: QueryResult, 
    faqMatches: FAQItem[]
  ): Promise<string> {
    let context = "MOSDAC Knowledge Base Context:\n\n";
    
    // Add relevant entities with detailed information
    if (queryResult.entities.length > 0) {
      context += "=== RELEVANT ENTITIES ===\n";
      queryResult.entities.slice(0, 10).forEach((entity, index) => {
        context += `${index + 1}. ${entity.name} (${entity.type})\n`;
        context += `   - Confidence: ${(entity.confidence * 100).toFixed(1)}%\n`;
        context += `   - Mentions: ${entity.mentions.length}\n`;
        
        // Add attributes if available
        if (entity.attributes && Object.keys(entity.attributes).length > 0) {
          Object.entries(entity.attributes).forEach(([key, value]) => {
            context += `   - ${key}: ${value}\n`;
          });
        }
        
        // Add recent mentions for context
        if (entity.mentions.length > 0) {
          const recentMention = entity.mentions[0];
          context += `   - Context: "${recentMention.context.substring(0, 100)}..."\n`;
        }
        context += "\n";
      });
    }
    
    // Add spatial matches with geographic information
    if (queryResult.spatialMatches.length > 0) {
      context += "=== GEOGRAPHIC COVERAGE ===\n";
      queryResult.spatialMatches.slice(0, 5).forEach((match, index) => {
        context += `${index + 1}. ${match.entity.name} ${match.spatialRelation} ${match.location}\n`;
        context += `   - Confidence: ${(match.confidence * 100).toFixed(1)}%\n`;
        if (match.metadata.coverage) {
          context += `   - Coverage: ${match.metadata.coverage}\n`;
        }
        if (match.metadata.resolution) {
          context += `   - Resolution: ${match.metadata.resolution}\n`;
        }
        context += "\n";
      });
    }
    
    // Add relationships
    if (queryResult.relationships.length > 0) {
      context += "=== ENTITY RELATIONSHIPS ===\n";
      queryResult.relationships.slice(0, 5).forEach((rel, index) => {
        const sourceEntity = this.entities.find(e => e.id === rel.source);
        const targetEntity = this.entities.find(e => e.id === rel.target);
        
        if (sourceEntity && targetEntity) {
          context += `${index + 1}. ${sourceEntity.name} ${rel.type.replace('_', ' ')} ${targetEntity.name}\n`;
          context += `   - Confidence: ${(rel.confidence * 100).toFixed(1)}%\n`;
          if (rel.evidence[0]) {
            context += `   - Evidence: "${rel.evidence[0].substring(0, 100)}..."\n`;
          }
          context += "\n";
        }
      });
    }
    
    // Add relevant FAQs
    if (faqMatches.length > 0) {
      context += "=== RELEVANT FAQs ===\n";
      faqMatches.slice(0, 3).forEach((faq, index) => {
        context += `${index + 1}. Q: ${faq.question}\n`;
        context += `   A: ${faq.answer}\n`;
        context += `   Category: ${faq.category}\n`;
        context += `   Keywords: ${faq.keywords.join(', ')}\n\n`;
      });
    }
    
    // Add general MOSDAC information
    context += `=== MOSDAC SYSTEM INFORMATION ===
MOSDAC (Meteorological & Oceanographic Satellite Data Archival Centre) is ISRO's facility for satellite data.

Key Satellites:
- INSAT-3D: Geostationary meteorological satellite with Imager and Sounder
- Oceansat-2: Ocean color monitoring with OCM sensor
- Scatsat-1: Ocean wind measurements with scatterometer
- Cartosat series: High-resolution Earth observation
- RISAT series: Radar imaging satellites

Data Products:
- Sea Surface Temperature (SST)
- Ocean Color and Chlorophyll
- Digital Elevation Models (DEM)
- Land Use Land Cover (LULC)
- Atmospheric profiles and wind data

Geographic Coverage:
- Primary focus on Indian Ocean region
- Comprehensive coverage of Indian subcontinent
- Global ocean monitoring capabilities

Instructions for AI Response:
1. Use the above knowledge base to provide accurate, specific answers
2. Reference specific satellites, sensors, and data products when relevant
3. Include technical details like resolution, coverage, and capabilities
4. Provide practical guidance for data access and applications
5. If information is not in the knowledge base, clearly state limitations
6. Suggest related queries or additional resources when helpful
`;
    
    return context;
  }

  // Generate local RAG response when Lyzr is not available
  private generateLocalRAGResponse(
    queryResult: QueryResult, 
    faqMatches: FAQItem[], 
    originalQuery: string,
    knowledgeContext: string
  ): RAGResponse {
    let response = '';
    let confidence = queryResult.confidence;
    const sources: string[] = [];
    
    // Check if we have good results
    if (queryResult.entities.length === 0 && queryResult.spatialMatches.length === 0 && faqMatches.length === 0) {
      return this.generateFallbackResponse(originalQuery, queryResult);
    }
    
    // Generate response based on available data
    if (queryResult.spatialMatches.length > 0) {
      response = this.generateSpatialResponse(originalQuery, queryResult.spatialMatches, queryResult.entities);
      sources.push(...queryResult.spatialMatches.map(m => m.entity.sourceDocuments).flat());
    } else if (queryResult.relationships.length > 0) {
      response = this.generateEntityRelationshipResponse(queryResult.entities, queryResult.relationships);
      sources.push(...queryResult.relationships.map(r => r.sourceUrls).flat());
    } else if (queryResult.entities.length > 0) {
      response = this.generateEntityResponse(queryResult.entities);
      sources.push(...queryResult.entities.map(e => e.sourceDocuments).flat());
    } else if (faqMatches.length > 0) {
      response = this.generateFAQResponse(faqMatches);
      sources.push('MOSDAC FAQ Database');
    }
    
    // Add FAQ information if available
    if (faqMatches.length > 0 && !response.includes('FAQ')) {
      response += `\n\n**Related Information:**\n`;
      faqMatches.slice(0, 2).forEach((faq, index) => {
        response += `\n**${index + 1}. ${faq.question}**\n${faq.answer}\n`;
      });
    }
    
    return {
      response,
      confidence,
      sources: [...new Set(sources)].slice(0, 5),
      relatedEntities: queryResult.entities.slice(0, 5),
      suggestedQuestions: this.generateSuggestedQuestions(queryResult),
      requiresHumanEscalation: confidence < 0.3,
      queryResult,
      faqMatches: faqMatches.slice(0, 3)
    };
  }

  // Generate FAQ-based response
  private generateFAQResponse(faqMatches: FAQItem[]): string {
    let response = `I found relevant information in the MOSDAC knowledge base:\n\n`;
    
    faqMatches.slice(0, 3).forEach((faq, index) => {
      response += `**${index + 1}. ${faq.question}**\n`;
      response += `${faq.answer}\n\n`;
    });
    
    if (faqMatches.length > 3) {
      response += `*And ${faqMatches.length - 3} additional related topics available.*\n\n`;
    }
    
    response += `Would you like more specific information about any of these topics?`;
    
    return response;
  }

  getConversationHistory(userId: string, sessionId: string = 'default'): ChatMessage[] {
    const context = this.conversationHistory.get(`${userId}-${sessionId}`);
    return context?.messages || [];
  }

  clearConversation(userId: string, sessionId: string = 'default'): void {
    this.conversationHistory.delete(`${userId}-${sessionId}`);
  }

  async processMessage(
    message: string,
    userId: string = 'default',
    sessionId: string = 'default'
  ): Promise<ChatMessage> {
    const messageId = this.generateMessageId();
    const timestamp = new Date();
    
    // Create user message
    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      type: 'user',
      content: message,
      timestamp
    };

    // Get or create conversation context
    const contextKey = `${userId}-${sessionId}`;
    let context = this.conversationHistory.get(contextKey);
    if (!context) {
      context = {
        userId,
        sessionId,
        messages: [],
        currentTopic: undefined,
        userIntent: undefined,
        spatialContext: undefined,
        temporalContext: undefined
      };
      this.conversationHistory.set(contextKey, context);
    }

    // Add user message to context
    context.messages.push(userMessage);

    try {
      // Track query metrics
      await realAnalyticsService.trackQuery(message, userId);

      // Check for simple greetings or help requests
      const lowerMessage = message.toLowerCase().trim();
      if (this.isGreeting(lowerMessage)) {
        const response = this.getRandomTemplate('greeting');
        const assistantMessage: ChatMessage = {
          id: messageId,
          type: 'assistant',
          content: response,
          timestamp: new Date(),
          metadata: {
            confidence: 1.0,
            sources: []
          }
        };
        context.messages.push(assistantMessage);
        return assistantMessage;
      }

      // Always process query with query engine first to get knowledge context
      const queryResult = await queryEngine.processQuery(message);
      
      // Search for relevant FAQs
      const faqMatches = await localDatabase.searchFAQs(message);
      
      // Get comprehensive knowledge context
      const knowledgeContext = await this.buildComprehensiveKnowledgeContext(message, queryResult, faqMatches);
      
      // Try Lyzr AI with full knowledge context
      if (lyzrService.isReady()) {
        try {
          const lyzrResponse = await lyzrService.generateResponse(
            message,
            userId,
            sessionId,
            knowledgeContext
          );
          
          const response: ChatMessage = {
            id: this.generateMessageId(),
            type: 'assistant',
            content: lyzrResponse.message,
            timestamp: new Date(),
            metadata: {
              confidence: lyzrResponse.confidence,
              sources: lyzrResponse.sources,
              queryResult,
              faqMatches: faqMatches.slice(0, 3),
              lyzrUsed: true
            }
          };
          
          context.messages.push(response);
          
          // Track analytics
          if (typeof realAnalyticsService !== 'undefined') {
            realAnalyticsService.trackQuery(
              sessionId,
              message,
              Date.now() - userMessage.timestamp.getTime(),
              lyzrResponse.confidence,
              queryResult.entities.length,
              queryResult.relationships.length,
              queryResult.spatialMatches.length,
              false,
              undefined,
              false,
              true
            );
          }
          
          return response;
        } catch (lyzrError) {
          console.warn('Lyzr AI failed, falling back to local processing:', lyzrError);
        }
      }
      
      // Fallback to local RAG processing with knowledge context
      const ragResponse = this.generateLocalRAGResponse(queryResult, faqMatches, message, knowledgeContext);
      
      const assistantMessage: ChatMessage = {
        id: messageId,
        type: 'assistant',
        content: ragResponse.response,
        timestamp: new Date(),
        metadata: {
          confidence: ragResponse.confidence,
          sources: ragResponse.sources,
          queryResult,
          faqMatches: faqMatches.slice(0, 3)
        }
      };

      context.messages.push(assistantMessage);

      // Update conversation context
      if (queryResult.entities.length > 0) {
        context.currentTopic = queryResult.entities[0].name;
      }
      if (queryResult.spatialMatches.length > 0) {
        context.spatialContext = queryResult.spatialMatches[0].location;
      }

      // Track response metrics
      await realAnalyticsService.trackResponse(ragResponse.confidence, ragResponse.sources.length);

      return assistantMessage;

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorResponse = this.generateErrorResponse();
      const assistantMessage: ChatMessage = {
        id: messageId,
        type: 'assistant',
        content: errorResponse.response,
        timestamp: new Date(),
        metadata: {
          confidence: 0,
          sources: [],
          fallbackReason: 'Processing error'
        }
      };

      context.messages.push(assistantMessage);
      return assistantMessage;
    }
  }

  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.includes(greeting));
  }

  private isHelpRequest(message: string): boolean {
    const helpKeywords = ['help', 'what can you do', 'how to use', 'commands', 'instructions'];
    return helpKeywords.some(keyword => message.includes(keyword));
  }

  updateKnowledgeBase(entities: Entity[], relationships: Relationship[], graphData: GraphData): void {
    this.entities = entities;
    this.relationships = relationships;
    this.graphData = graphData;
  }
}

export default new RAGService();