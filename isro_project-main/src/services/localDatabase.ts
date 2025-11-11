// Local JSON file database service
import faqService, { FAQItem } from './faqService';

export interface KnowledgeBase {
  faqs: FAQItem[];
  entities: any[];
  relationships: any[];
  metadata: {
    lastUpdated: string;
    version: string;
    totalItems: number;
  };
}

class LocalDatabaseService {
  private knowledgeBase: KnowledgeBase = {
    faqs: [],
    entities: [],
    relationships: [],
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      totalItems: 0
    }
  };

  // Read function: Load data from knowledge_base.json
  async read(): Promise<KnowledgeBase> {
    try {
      // In a browser environment, we'll use localStorage as our "file system"
      const stored = localStorage.getItem('knowledge_base');
      if (stored) {
        this.knowledgeBase = JSON.parse(stored);
        return this.knowledgeBase;
      }
      
      // If no stored data, initialize with FAQ data
      await this.initializeWithFAQs();
      return this.knowledgeBase;
    } catch (error) {
      console.error('Error reading knowledge base:', error);
      // Return default structure on error
      return this.knowledgeBase;
    }
  }

  // Write function: Save data to knowledge_base.json (localStorage)
  async write(data: KnowledgeBase): Promise<boolean> {
    try {
      // Update metadata
      data.metadata.lastUpdated = new Date().toISOString();
      data.metadata.totalItems = data.faqs.length + data.entities.length + data.relationships.length;
      
      // Store in localStorage (simulating file write)
      localStorage.setItem('knowledge_base', JSON.stringify(data, null, 2));
      
      // Also update in-memory copy
      this.knowledgeBase = data;
      
      console.log('Knowledge base saved successfully');
      return true;
    } catch (error) {
      console.error('Error writing knowledge base:', error);
      return false;
    }
  }

  // Initialize with FAQ data from faqService
  private async initializeWithFAQs(): Promise<void> {
    try {
      const faqs = faqService.getAllFAQs();
      
      // Also initialize with some sample entities and relationships for demo
      const sampleEntities = this.createSampleEntities();
      const sampleRelationships = this.createSampleRelationships();
      
      this.knowledgeBase = {
        faqs: faqs,
        entities: sampleEntities,
        relationships: sampleRelationships,
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '1.0.0',
          totalItems: faqs.length + sampleEntities.length + sampleRelationships.length
        }
      };
      
      // Save the initialized data
      await this.write(this.knowledgeBase);
      
      console.log(`Initialized knowledge base with ${faqs.length} FAQs, ${sampleEntities.length} entities, ${sampleRelationships.length} relationships`);
    } catch (error) {
      console.error('Error initializing knowledge base:', error);
    }
  }

  private createSampleEntities(): any[] {
    return [
      {
        id: 'satellite_insat3d',
        name: 'INSAT-3D',
        type: 'satellite',
        confidence: 0.95,
        attributes: {
          launchDate: '2013-07-26',
          orbit: 'Geostationary',
          coverage: 'Indian Ocean Region',
          status: 'Operational'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/satellites/insat3d'],
        mentions: [
          {
            text: 'INSAT-3D',
            context: 'INSAT-3D is a geostationary meteorological satellite equipped with an Imager and Sounder',
            confidence: 0.95,
            sourceUrl: 'https://www.mosdac.gov.in/satellites/insat3d'
          }
        ]
      },
      {
        id: 'satellite_oceansat2',
        name: 'Oceansat-2',
        type: 'satellite',
        confidence: 0.93,
        attributes: {
          launchDate: '2009-09-23',
          orbit: 'Sun-synchronous',
          coverage: 'Global Ocean',
          status: 'Operational'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/satellites/oceansat2'],
        mentions: [
          {
            text: 'Oceansat-2',
            context: 'Oceansat-2 satellite mission focuses on oceanographic and coastal applications',
            confidence: 0.93,
            sourceUrl: 'https://www.mosdac.gov.in/satellites/oceansat2'
          }
        ]
      },
      {
        id: 'satellite_scatsat1',
        name: 'Scatsat-1',
        type: 'satellite',
        confidence: 0.91,
        attributes: {
          launchDate: '2016-09-26',
          orbit: 'Sun-synchronous',
          coverage: 'Global Ocean',
          status: 'Operational'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/satellites/scatsat1'],
        mentions: [
          {
            text: 'Scatsat-1',
            context: 'Scatsat-1 is a dedicated scatterometer mission for measuring ocean surface wind vectors',
            confidence: 0.91,
            sourceUrl: 'https://www.mosdac.gov.in/satellites/scatsat1'
          }
        ]
      },
      {
        id: 'sensor_imager',
        name: 'Imager',
        type: 'sensor',
        confidence: 0.88,
        attributes: {
          bands: 'Visible, Near-IR, Thermal-IR',
          resolution: '1 km',
          applications: 'Weather monitoring, Cloud detection'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/satellites/insat3d'],
        mentions: [
          {
            text: 'Imager',
            context: 'The Imager provides multi-spectral observations in visible, near-infrared, and thermal infrared bands',
            confidence: 0.88,
            sourceUrl: 'https://www.mosdac.gov.in/satellites/insat3d'
          }
        ]
      },
      {
        id: 'sensor_sounder',
        name: 'Sounder',
        type: 'sensor',
        confidence: 0.87,
        attributes: {
          channels: '18 spectral channels',
          application: 'Atmospheric profiling',
          verticalResolution: '1 km'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/satellites/insat3d'],
        mentions: [
          {
            text: 'Sounder',
            context: 'The Sounder measures atmospheric temperature and humidity profiles using 18 spectral channels',
            confidence: 0.87,
            sourceUrl: 'https://www.mosdac.gov.in/satellites/insat3d'
          }
        ]
      },
      {
        id: 'sensor_ocm',
        name: 'Ocean Colour Monitor',
        type: 'sensor',
        confidence: 0.89,
        attributes: {
          bands: '8 spectral bands',
          resolution: '360 m',
          application: 'Ocean color, Coastal monitoring'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/satellites/oceansat2'],
        mentions: [
          {
            text: 'Ocean Colour Monitor',
            context: 'OCM provides multi-spectral observations in 8 bands ranging from 402 nm to 885 nm',
            confidence: 0.89,
            sourceUrl: 'https://www.mosdac.gov.in/satellites/oceansat2'
          }
        ]
      },
      {
        id: 'location_mumbai',
        name: 'Mumbai',
        type: 'location',
        confidence: 0.85,
        attributes: {
          state: 'Maharashtra',
          coordinates: '19.0760°N, 72.8777°E',
          coverage: 'Urban monitoring, Coastal studies'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/data'],
        mentions: [
          {
            text: 'Mumbai',
            context: 'Satellite data available for Mumbai metropolitan region',
            confidence: 0.85,
            sourceUrl: 'https://www.mosdac.gov.in/data'
          }
        ]
      },
      {
        id: 'location_kerala',
        name: 'Kerala',
        type: 'location',
        confidence: 0.86,
        attributes: {
          type: 'State',
          coordinates: '10.8505°N, 76.2711°E',
          coverage: 'Coastal monitoring, Agriculture'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/data'],
        mentions: [
          {
            text: 'Kerala',
            context: 'Satellite imagery and data products available for Kerala state',
            confidence: 0.86,
            sourceUrl: 'https://www.mosdac.gov.in/data'
          }
        ]
      },
      {
        id: 'data_product_sst',
        name: 'Sea Surface Temperature',
        type: 'data_product',
        confidence: 0.84,
        attributes: {
          format: 'NetCDF, HDF',
          resolution: '1 km',
          updateFrequency: 'Daily'
        },
        sourceDocuments: ['https://www.mosdac.gov.in/data'],
        mentions: [
          {
            text: 'Sea Surface Temperature',
            context: 'Sea surface temperature data products available from INSAT-3D and other satellites',
            confidence: 0.84,
            sourceUrl: 'https://www.mosdac.gov.in/data'
          }
        ]
      }
    ];
  }

  private createSampleRelationships(): any[] {
    return [
      {
        id: 'rel_insat3d_imager',
        source: 'satellite_insat3d',
        target: 'sensor_imager',
        type: 'carries',
        confidence: 0.95,
        evidence: ['INSAT-3D is equipped with an Imager and Sounder'],
        sourceUrls: ['https://www.mosdac.gov.in/satellites/insat3d']
      },
      {
        id: 'rel_insat3d_sounder',
        source: 'satellite_insat3d',
        target: 'sensor_sounder',
        type: 'carries',
        confidence: 0.95,
        evidence: ['INSAT-3D is equipped with an Imager and Sounder'],
        sourceUrls: ['https://www.mosdac.gov.in/satellites/insat3d']
      },
      {
        id: 'rel_oceansat2_ocm',
        source: 'satellite_oceansat2',
        target: 'sensor_ocm',
        type: 'carries',
        confidence: 0.93,
        evidence: ['Oceansat-2 carries the Ocean Colour Monitor (OCM) sensor'],
        sourceUrls: ['https://www.mosdac.gov.in/satellites/oceansat2']
      },
      {
        id: 'rel_insat3d_sst',
        source: 'satellite_insat3d',
        target: 'data_product_sst',
        type: 'provides',
        confidence: 0.88,
        evidence: ['INSAT-3D provides sea surface temperature measurements'],
        sourceUrls: ['https://www.mosdac.gov.in/data/insat3d']
      },
      {
        id: 'rel_mumbai_coverage',
        source: 'satellite_insat3d',
        target: 'location_mumbai',
        type: 'covers',
        confidence: 0.85,
        evidence: ['INSAT-3D provides coverage of the Mumbai region'],
        sourceUrls: ['https://www.mosdac.gov.in/data']
      },
      {
        id: 'rel_kerala_coverage',
        source: 'satellite_oceansat2',
        target: 'location_kerala',
        type: 'covers',
        confidence: 0.86,
        evidence: ['Oceansat-2 provides coastal monitoring data for Kerala'],
        sourceUrls: ['https://www.mosdac.gov.in/data']
      }
    ];
  }

  // Add FAQ to knowledge base
  async addFAQ(faq: Omit<FAQItem, 'id' | 'lastUpdated'>): Promise<string> {
    const data = await this.read();
    
    const id = `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFAQ: FAQItem = {
      ...faq,
      id,
      lastUpdated: new Date()
    };
    
    data.faqs.push(newFAQ);
    await this.write(data);
    
    return id;
  }

  // Search FAQs in knowledge base
  async searchFAQs(query: string): Promise<FAQItem[]> {
    const data = await this.read();
    const queryLower = query.toLowerCase();
    const results: { faq: FAQItem; score: number }[] = [];

    data.faqs.forEach(faq => {
      let score = 0;

      // Check question match
      if (faq.question.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Check answer match
      if (faq.answer.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Check keyword matches
      faq.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())) {
          score += 3;
        }
      });

      // Check for partial word matches
      const queryWords = queryLower.split(' ').filter(word => word.length > 2);
      queryWords.forEach(word => {
        if (faq.question.toLowerCase().includes(word)) score += 2;
        if (faq.answer.toLowerCase().includes(word)) score += 1;
      });

      if (score > 0) {
        results.push({ faq, score });
      }
    });

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(result => result.faq);
  }

  // Add entities and relationships from NLP processing
  async addProcessedData(entities: any[], relationships: any[]): Promise<boolean> {
    const data = await this.read();
    
    // Merge new entities (avoid duplicates)
    entities.forEach(entity => {
      const exists = data.entities.find(e => e.id === entity.id);
      if (!exists) {
        data.entities.push(entity);
      }
    });
    
    // Merge new relationships (avoid duplicates)
    relationships.forEach(relationship => {
      const exists = data.relationships.find(r => r.id === relationship.id);
      if (!exists) {
        data.relationships.push(relationship);
      }
    });
    
    return await this.write(data);
  }

  // Get all data
  async getAllData(): Promise<KnowledgeBase> {
    return await this.read();
  }

  // Get statistics
  async getStats(): Promise<{
    totalFAQs: number;
    totalEntities: number;
    totalRelationships: number;
    lastUpdated: string;
    version: string;
  }> {
    const data = await this.read();
    
    return {
      totalFAQs: data.faqs.length,
      totalEntities: data.entities.length,
      totalRelationships: data.relationships.length,
      lastUpdated: data.metadata.lastUpdated,
      version: data.metadata.version
    };
  }

  // Clear all data
  async clearAll(): Promise<boolean> {
    this.knowledgeBase = {
      faqs: [],
      entities: [],
      relationships: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        totalItems: 0
      }
    };
    
    return await this.write(this.knowledgeBase);
  }

  // Export data as JSON string
  async exportData(): Promise<string> {
    const data = await this.read();
    return JSON.stringify(data, null, 2);
  }

  // Import data from JSON string
  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData) as KnowledgeBase;
      return await this.write(data);
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export default new LocalDatabaseService();