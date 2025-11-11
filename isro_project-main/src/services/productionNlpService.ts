import nlp from "compromise";
import { v4 as uuidv4 } from "uuid";

export interface Entity {
  id: string;
  type: 'satellite' | 'sensor' | 'data_product' | 'location' | 'organization' | 'mission';
  name: string;
  confidence: number;
  attributes: Record<string, any>;
  sourceDocuments: string[];
  mentions: EntityMention[];
}

export interface EntityMention {
  text: string;
  context: string;
  confidence: number;
  sourceUrl: string;
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
  evidence: string[];
  sourceUrls: string[];
}

class ProductionNLPService {
  private entities: Map<string, Entity> = new Map();
  private relationships: Relationship[] = [];

  // Enhanced patterns for MOSDAC domain
  private satellitePatterns = [
    /\b(Cartosat[-\s]?\d+[A-Z]?)\b/gi,
    /\b(RISAT[-\s]?\d+[A-Z]?)\b/gi,
    /\b(ResourceSat[-\s]?\d+[A-Z]?)\b/gi,
    /\b(INSAT[-\s]?\d+[A-Z]?)\b/gi,
    /\b(GSAT[-\s]?\d+[A-Z]?)\b/gi,
    /\b(Oceansat[-\s]?\d+[A-Z]?)\b/gi,
    /\b(Megha[-\s]?Tropiques)\b/gi,
    /\b(SARAL)\b/gi,
    /\b(Astrosat)\b/gi,
    /\b(Scatsat[-\s]?\d+[A-Z]?)\b/gi
  ];

  private sensorPatterns = [
    /\b(LISS[-\s]?[IV]+)\b/gi,
    /\b(AWiFS)\b/gi,
    /\b(PAN)\b/gi,
    /\b(WiFS)\b/gi,
    /\b(UVNIR)\b/gi,
    /\b(SWIR)\b/gi,
    /\b(TIR)\b/gi,
    /\b(SAR)\b/gi,
    /\b(C[-\s]?band)\b/gi,
    /\b(L[-\s]?band)\b/gi,
    /\b(X[-\s]?band)\b/gi,
    /\b(Imager)\b/gi,
    /\b(Sounder)\b/gi,
    /\b(OCM|Ocean Colour Monitor)\b/gi,
    /\b(Scatterometer)\b/gi
  ];

  private dataProductPatterns = [
    /\b(DEM|Digital Elevation Model)\b/gi,
    /\b(LULC|Land Use Land Cover)\b/gi,
    /\b(NDVI|Normalized Difference Vegetation Index)\b/gi,
    /\b(LST|Land Surface Temperature)\b/gi,
    /\b(Ortho[-\s]?rectified)\b/gi,
    /\b(Geocoded)\b/gi,
    /\b(Radiometrically[-\s]?corrected)\b/gi,
    /\b(Atmospherically[-\s]?corrected)\b/gi,
    /\b(Sea Surface Temperature|SST)\b/gi,
    /\b(Ocean Color|Ocean Colour)\b/gi,
    /\b(Chlorophyll)\b/gi,
    /\b(Wind Speed|Wind Vector)\b/gi
  ];

  private relationshipPatterns = [
    {
      pattern: /(\w+(?:\s+\w+)*)\s+(?:carries|equipped with|has)\s+(\w+(?:\s+\w+)*)/gi,
      type: 'carries'
    },
    {
      pattern: /(\w+(?:\s+\w+)*)\s+(?:provides|generates|produces)\s+(\w+(?:\s+\w+)*)/gi,
      type: 'provides'
    },
    {
      pattern: /(\w+(?:\s+\w+)*)\s+(?:used for|utilized for)\s+(\w+(?:\s+\w+)*)/gi,
      type: 'used_for'
    },
    {
      pattern: /(\w+(?:\s+\w+)*)\s+(?:launched|deployed)\s+(?:on|in)\s+(\d{4})/gi,
      type: 'launched_in'
    },
    {
      pattern: /(\w+(?:\s+\w+)*)\s+(?:covers|monitors)\s+(\w+(?:\s+\w+)*)/gi,
      type: 'covers'
    }
  ];

  async processText(text: string, sourceUrl: string): Promise<void> {
    // Extract entities
    await this.extractEntities(text, sourceUrl);
    
    // Extract advanced entities with context awareness
    await this.extractAdvancedEntities(text, sourceUrl);
    
    // Extract relationships
    await this.extractRelationships(text, sourceUrl);
    
    // Perform sentiment analysis (simplified without external package)
    await this.performSentimentAnalysis(text, sourceUrl);
  }

  private async extractEntities(text: string, sourceUrl: string): Promise<void> {
    // Extract satellites
    this.satellitePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.addEntity({
            name: match.trim(),
            type: 'satellite',
            text: match,
            context: this.getContext(text, match),
            sourceUrl,
            confidence: 0.9
          });
        });
      }
    });

    // Extract sensors
    this.sensorPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.addEntity({
            name: match.trim(),
            type: 'sensor',
            text: match,
            context: this.getContext(text, match),
            sourceUrl,
            confidence: 0.85
          });
        });
      }
    });

    // Extract data products
    this.dataProductPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.addEntity({
            name: match.trim(),
            type: 'data_product',
            text: match,
            context: this.getContext(text, match),
            sourceUrl,
            confidence: 0.8
          });
        });
      }
    });

    // Use compromise.js for additional entity extraction
    const doc = nlp(text);
    
    // Extract places (locations)
    const places = doc.places().out('array');
    places.forEach(place => {
      this.addEntity({
        name: place,
        type: 'location',
        text: place,
        context: this.getContext(text, place),
        sourceUrl,
        confidence: 0.7
      });
    });

    // Extract organizations
    const orgs = doc.organizations().out('array');
    orgs.forEach(org => {
      if (org.length > 2) { // Filter out short matches
        this.addEntity({
          name: org,
          type: 'organization',
          text: org,
          context: this.getContext(text, org),
          sourceUrl,
          confidence: 0.75
        });
      }
    });
  }

  private async extractRelationships(text: string, sourceUrl: string): Promise<void> {
    this.relationshipPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const source = match[1].trim();
        const target = match[2].trim();
        
        // Find corresponding entities
        const sourceEntity = this.findEntityByName(source);
        const targetEntity = this.findEntityByName(target);
        
        if (sourceEntity && targetEntity) {
          this.addRelationship({
            source: sourceEntity.id,
            target: targetEntity.id,
            type,
            evidence: [match[0]],
            sourceUrl,
            confidence: 0.8
          });
        }
      }
    });
  }

  private async performSentimentAnalysis(text: string, sourceUrl: string): Promise<void> {
    // Simplified sentiment analysis without external package
    const positiveWords = ['good', 'excellent', 'great', 'amazing', 'wonderful', 'fantastic', 'outstanding', 'superior', 'advanced', 'innovative'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointing', 'failed', 'error', 'problem', 'issue'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    const sentiment = positiveCount > negativeCount ? 'positive' : 
                     negativeCount > positiveCount ? 'negative' : 'neutral';
    
    // Store sentiment as metadata for entities
    this.entities.forEach(entity => {
      if (entity.sourceDocuments.includes(sourceUrl)) {
        entity.attributes.sentiment = sentiment;
        entity.attributes.sentimentScore = (positiveCount - negativeCount) / Math.max(words.length, 1);
      }
    });
  }

  private addEntity(mention: {
    name: string;
    type: Entity['type'];
    text: string;
    context: string;
    sourceUrl: string;
    confidence: number;
  }): void {
    const normalizedName = mention.name.toLowerCase().trim();
    let entity = Array.from(this.entities.values()).find(e => 
      e.name.toLowerCase() === normalizedName
    );

    if (!entity) {
      entity = {
        id: uuidv4(),
        type: mention.type,
        name: mention.name,
        confidence: mention.confidence,
        attributes: {},
        sourceDocuments: [mention.sourceUrl],
        mentions: []
      };
      this.entities.set(entity.id, entity);
    }

    // Add mention
    entity.mentions.push({
      text: mention.text,
      context: mention.context,
      confidence: mention.confidence,
      sourceUrl: mention.sourceUrl
    });

    // Update confidence (average of all mentions)
    entity.confidence = entity.mentions.reduce((sum, m) => sum + m.confidence, 0) / entity.mentions.length;

    // Add source document if not already present
    if (!entity.sourceDocuments.includes(mention.sourceUrl)) {
      entity.sourceDocuments.push(mention.sourceUrl);
    }
  }

  private addRelationship(rel: {
    source: string;
    target: string;
    type: string;
    evidence: string[];
    sourceUrl: string;
    confidence: number;
  }): void {
    // Check if relationship already exists
    const existing = this.relationships.find(r => 
      r.source === rel.source && r.target === rel.target && r.type === rel.type
    );

    if (existing) {
      // Update existing relationship
      existing.evidence.push(...rel.evidence);
      existing.sourceUrls.push(rel.sourceUrl);
      existing.confidence = Math.max(existing.confidence, rel.confidence);
    } else {
      // Create new relationship
      this.relationships.push({
        id: uuidv4(),
        source: rel.source,
        target: rel.target,
        type: rel.type,
        confidence: rel.confidence,
        evidence: rel.evidence,
        sourceUrls: [rel.sourceUrl]
      });
    }
  }

  private getContext(text: string, term: string, contextLength: number = 100): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + term.length + contextLength);
    
    return text.substring(start, end).trim();
  }

  private findEntityByName(name: string): Entity | undefined {
    const normalizedName = name.toLowerCase().trim();
    return Array.from(this.entities.values()).find(entity => 
      entity.name.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(entity.name.toLowerCase())
    );
  }

  getEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  getRelationships(): Relationship[] {
    return this.relationships;
  }

  getEntityById(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  clear(): void {
    this.entities.clear();
    this.relationships = [];
  }

  // Enhanced statistics
  getStats() {
    const entities = this.getEntities();
    const entityTypes = entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sentimentDistribution = entities.reduce((acc, entity) => {
      const sentiment = entity.attributes.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEntities: entities.length,
      totalRelationships: this.relationships.length,
      entityTypes,
      sentimentDistribution,
      averageConfidence: entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length || 0,
      averageSentimentScore: entities
        .filter(e => e.attributes.sentimentScore !== undefined)
        .reduce((sum, e) => sum + (e.attributes.sentimentScore || 0), 0) / 
        Math.max(entities.filter(e => e.attributes.sentimentScore !== undefined).length, 1)
    };
  }

  // Advanced entity extraction with context awareness
  async extractAdvancedEntities(text: string, sourceUrl: string, context?: string): Promise<void> {
    const doc = nlp(text);
    
    // Extract technical terms
    const technicalTerms = doc.match('#Noun+ #Noun+').out('array');
    technicalTerms.forEach(term => {
      if (term.length > 5 && this.isTechnicalTerm(term)) {
        this.addEntity({
          name: term,
          type: this.classifyTechnicalTerm(term),
          text: term,
          context: this.getContext(text, term),
          sourceUrl,
          confidence: 0.7
        });
      }
    });

    // Extract mission names
    const missionPattern = /\b([A-Z][a-z]+[-\s]?\d*)\s+(?:mission|program|project)\b/gi;
    let match;
    while ((match = missionPattern.exec(text)) !== null) {
      this.addEntity({
        name: match[1],
        type: 'mission',
        text: match[0],
        context: this.getContext(text, match[0]),
        sourceUrl,
        confidence: 0.8
      });
    }
  }

  private isTechnicalTerm(term: string): boolean {
    const technicalKeywords = [
      'satellite', 'sensor', 'imagery', 'resolution', 'spectral', 'band',
      'orbit', 'payload', 'antenna', 'frequency', 'wavelength', 'pixel',
      'algorithm', 'processing', 'calibration', 'validation', 'accuracy'
    ];
    
    return technicalKeywords.some(keyword => 
      term.toLowerCase().includes(keyword)
    );
  }

  private classifyTechnicalTerm(term: string): Entity['type'] {
    const termLower = term.toLowerCase();
    
    if (termLower.includes('satellite') || termLower.includes('sat')) {
      return 'satellite';
    } else if (termLower.includes('sensor') || termLower.includes('camera') || termLower.includes('imager')) {
      return 'sensor';
    } else if (termLower.includes('data') || termLower.includes('product') || termLower.includes('imagery')) {
      return 'data_product';
    } else if (termLower.includes('mission') || termLower.includes('program')) {
      return 'mission';
    } else {
      return 'organization';
    }
  }
}

export default new ProductionNLPService();