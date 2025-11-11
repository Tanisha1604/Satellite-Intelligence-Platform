// Mock crawler service for frontend-only demonstration
// In a production environment, this would be a backend service
import localDatabase from './localDatabase';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface CrawlProgress {
  totalUrls: number;
  processedUrls: number;
  currentUrl: string;
  errors: string[];
}

// Mock MOSDAC data for demonstration
const mockMosdacData: Omit<CrawlResult, 'timestamp'>[] = [
  {
    url: 'https://www.mosdac.gov.in',
    title: 'MOSDAC - Meteorological & Oceanographic Satellite Data Archival Centre',
    content: `MOSDAC (Meteorological & Oceanographic Satellite Data Archival Centre) is a facility established by ISRO to archive, process and disseminate oceanographic and meteorological satellite data. The centre provides data from various Indian satellites including INSAT-3D, INSAT-3DR, Oceansat-2, Scatsat-1, and other international satellites. MOSDAC serves as a comprehensive repository for satellite-based observations of Earth's atmosphere and oceans. The facility supports research in weather forecasting, climate studies, oceanography, and environmental monitoring. Data products include sea surface temperature, ocean color, wind speed and direction, atmospheric temperature and humidity profiles, and precipitation measurements.`,
    links: [
      'https://www.mosdac.gov.in/data',
      'https://www.mosdac.gov.in/satellites',
      'https://www.mosdac.gov.in/products'
    ],
    metadata: {
      description: 'MOSDAC provides satellite data for meteorological and oceanographic applications',
      keywords: 'satellite data, meteorology, oceanography, ISRO, weather',
      headings: ['Welcome to MOSDAC', 'Satellite Data Services', 'Data Products', 'Research Applications']
    }
  },
  {
    url: 'https://www.mosdac.gov.in/data',
    title: 'MOSDAC Data Products and Services',
    content: `MOSDAC provides a wide range of satellite data products for meteorological and oceanographic applications. The data archive includes observations from INSAT-3D geostationary satellite which provides atmospheric temperature and humidity soundings, sea surface temperature, and outgoing longwave radiation. INSAT-3DR satellite offers similar capabilities with improved spatial and temporal resolution. Oceansat-2 satellite provides ocean color data for monitoring phytoplankton, chlorophyll concentration, and water quality parameters. The Scatsat-1 satellite measures ocean surface wind vectors using scatterometer technology. Additional data products include TRMM precipitation data, MODIS ocean color and sea surface temperature, and QuikSCAT wind measurements. All data products are available in standard formats including HDF, NetCDF, and GeoTIFF.`,
    links: [
      'https://www.mosdac.gov.in/data/insat3d',
      'https://www.mosdac.gov.in/data/oceansat2',
      'https://www.mosdac.gov.in/data/scatsat1'
    ],
    metadata: {
      description: 'Comprehensive satellite data products for research and applications',
      keywords: 'INSAT-3D, Oceansat-2, Scatsat-1, satellite data products',
      headings: ['Data Products Overview', 'INSAT-3D Products', 'Oceansat-2 Products', 'Scatsat-1 Products']
    }
  },
  {
    url: 'https://www.mosdac.gov.in/satellites',
    title: 'MOSDAC Satellite Missions and Sensors',
    content: `MOSDAC archives data from multiple satellite missions operated by ISRO and international space agencies. INSAT-3D is a geostationary meteorological satellite equipped with an Imager and Sounder. The Imager provides multi-spectral observations in visible, near-infrared, and thermal infrared bands for weather monitoring and nowcasting. The Sounder measures atmospheric temperature and humidity profiles using 18 spectral channels. INSAT-3DR is an advanced version with improved radiometric accuracy and spatial resolution. Oceansat-2 carries the Ocean Colour Monitor (OCM) sensor for marine and coastal applications. OCM operates in 8 spectral bands optimized for ocean color measurements and coastal zone monitoring. Scatsat-1 features a Ku-band scatterometer for measuring ocean surface wind speed and direction. The satellite also carries Radio Occultation System for atmospheric profiling. Additional missions include SARAL-AltiKa for sea surface height measurements and Megha-Tropiques for tropical weather and climate studies.`,
    links: [
      'https://www.mosdac.gov.in/satellites/insat3d',
      'https://www.mosdac.gov.in/satellites/oceansat2',
      'https://www.mosdac.gov.in/satellites/scatsat1'
    ],
    metadata: {
      description: 'Information about satellite missions and sensor specifications',
      keywords: 'INSAT-3D, INSAT-3DR, Oceansat-2, Scatsat-1, satellite sensors',
      headings: ['Satellite Missions', 'INSAT Series', 'Oceansat Mission', 'Scatsat Mission', 'Sensor Specifications']
    }
  },
  {
    url: 'https://www.mosdac.gov.in/data/insat3d',
    title: 'INSAT-3D Data Products and Applications',
    content: `INSAT-3D satellite provides comprehensive meteorological observations for weather forecasting and climate monitoring. The satellite operates from 82°E geostationary orbit and covers the Indian Ocean region. Imager data products include visible and infrared imagery for cloud detection, sea surface temperature, land surface temperature, and vegetation monitoring. The 1 km resolution visible channel enables detailed cloud structure analysis and fog detection. Thermal infrared channels at 4 μm and 10.8 μm provide temperature measurements for atmospheric and surface applications. Water vapor channel at 6.7 μm tracks moisture distribution in the middle troposphere. Sounder products include atmospheric temperature profiles from surface to 70 km altitude with 1 km vertical resolution. Humidity profiles are derived from multiple water vapor absorption channels. Total precipitable water and atmospheric stability indices are computed from sounder measurements. Data applications include numerical weather prediction model initialization, severe weather monitoring, agricultural meteorology, and climate research.`,
    links: [],
    metadata: {
      description: 'INSAT-3D satellite data products for meteorological applications',
      keywords: 'INSAT-3D, meteorological satellite, weather forecasting, atmospheric sounding',
      headings: ['INSAT-3D Overview', 'Imager Products', 'Sounder Products', 'Applications']
    }
  },
  {
    url: 'https://www.mosdac.gov.in/data/oceansat2',
    title: 'Oceansat-2 Ocean Color and Coastal Monitoring',
    content: `Oceansat-2 satellite mission focuses on oceanographic and coastal applications using the Ocean Colour Monitor (OCM) sensor. OCM provides multi-spectral observations in 8 bands ranging from 402 nm to 885 nm with 360 m spatial resolution. The sensor design optimizes sensitivity for detecting phytoplankton pigments, suspended sediments, and dissolved organic matter in marine environments. Chlorophyll-a concentration maps are generated using bio-optical algorithms calibrated for Indian coastal waters. Ocean color products include normalized water-leaving radiance, remote sensing reflectance, and diffuse attenuation coefficient. Coastal zone applications encompass water quality monitoring, harmful algal bloom detection, and sediment transport studies. The satellite also carries a Ku-band pencil beam scatterometer for ocean surface wind measurements. Wind vector products provide speed and direction with 50 km spatial resolution and 2 m/s accuracy. Scatterometer data supports weather forecasting, ocean circulation modeling, and marine safety applications. Additional products include sea surface roughness and rain flagging for data quality control.`,
    links: [],
    metadata: {
      description: 'Oceansat-2 ocean color and scatterometer data for marine applications',
      keywords: 'Oceansat-2, ocean color, chlorophyll, scatterometer, coastal monitoring',
      headings: ['Oceansat-2 Mission', 'Ocean Colour Monitor', 'Scatterometer', 'Marine Applications']
    }
  },
  {
    url: 'https://www.mosdac.gov.in/data/scatsat1',
    title: 'Scatsat-1 Ocean Wind Measurements and Applications',
    content: `Scatsat-1 is a dedicated scatterometer mission for measuring ocean surface wind vectors with high accuracy and spatial coverage. The satellite carries a Ku-band scatterometer operating at 13.515 GHz frequency with dual polarization capability. The pencil beam scanning geometry provides 1800 km swath width with 25 km spatial resolution. Wind vector retrieval algorithms process normalized radar cross-section measurements to derive wind speed and direction. The mission provides global ocean wind observations with 2-day repeat coverage and supports numerical weather prediction models. Wind products include Level 2 swath data and Level 3 gridded products at various temporal and spatial resolutions. Quality control procedures identify and flag rain contamination, land contamination, and ice-covered areas. Scatsat-1 data applications include tropical cyclone monitoring, monsoon studies, ocean-atmosphere interaction research, and marine weather services. The satellite also features a Radio Occultation System (ROS) for atmospheric profiling using GPS signals. ROS provides temperature and humidity profiles with high vertical resolution for numerical weather prediction and climate studies.`,
    links: [],
    metadata: {
      description: 'Scatsat-1 scatterometer for ocean wind vector measurements',
      keywords: 'Scatsat-1, scatterometer, ocean winds, radio occultation, weather prediction',
      headings: ['Scatsat-1 Mission', 'Scatterometer Technology', 'Wind Vector Products', 'Radio Occultation']
    }
  }
];

class CrawlerService {
  private results: CrawlResult[] = [];
  private progressCallback?: (progress: CrawlProgress) => void;

  setProgressCallback(callback: (progress: CrawlProgress) => void) {
    this.progressCallback = callback;
  }

  async startCrawl(startUrls: string[] = []): Promise<CrawlResult[]> {
    this.results = [];
    
    // Simulate crawling process with realistic timing
    const totalUrls = mockMosdacData.length;
    
    for (let i = 0; i < mockMosdacData.length; i++) {
      const mockData = mockMosdacData[i];
      
      // Update progress
      this.progressCallback?.({
        totalUrls,
        processedUrls: i,
        currentUrl: mockData.url,
        errors: []
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      
      // Add timestamp and push to results
      const result: CrawlResult = {
        ...mockData,
        timestamp: new Date()
      };
      
      this.results.push(result);
    }

    // Final progress update
    this.progressCallback?.({
      totalUrls,
      processedUrls: totalUrls,
      currentUrl: 'Crawling completed',
      errors: []
    });

    // Save crawled data to local database
    try {
      const entities = this.extractEntitiesFromResults(this.results);
      const relationships = this.extractRelationshipsFromResults(this.results);
      await localDatabase.addProcessedData(entities, relationships);
      console.log('Crawled data saved to local database');
    } catch (error) {
      console.error('Error saving crawled data:', error);
    }

    return this.results;
  }

  private extractEntitiesFromResults(results: CrawlResult[]): any[] {
    const entities: any[] = [];
    
    results.forEach(result => {
      // Extract satellite entities
      const satelliteMatches = result.content.match(/\b(INSAT-3D|INSAT-3DR|Oceansat-2|Scatsat-1|SARAL|Megha-Tropiques)\b/gi);
      if (satelliteMatches) {
        satelliteMatches.forEach(match => {
          entities.push({
            id: `satellite_${match.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: match,
            type: 'satellite',
            confidence: 0.9,
            sourceUrl: result.url,
            attributes: {},
            mentions: [{
              text: match,
              context: this.getContext(result.content, match),
              confidence: 0.9,
              sourceUrl: result.url
            }]
          });
        });
      }
      
      // Extract sensor entities
      const sensorMatches = result.content.match(/\b(Imager|Sounder|OCM|Ocean Colour Monitor|Scatterometer)\b/gi);
      if (sensorMatches) {
        sensorMatches.forEach(match => {
          entities.push({
            id: `sensor_${match.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: match,
            type: 'sensor',
            confidence: 0.85,
            sourceUrl: result.url,
            attributes: {},
            mentions: [{
              text: match,
              context: this.getContext(result.content, match),
              confidence: 0.85,
              sourceUrl: result.url
            }]
          });
        });
      }
    });
    
    return entities;
  }

  private extractRelationshipsFromResults(results: CrawlResult[]): any[] {
    const relationships: any[] = [];
    
    results.forEach(result => {
      // Extract "carries" relationships
      const carriesMatches = result.content.match(/(\w+(?:\s+\w+)*)\s+(?:carries|equipped with|has)\s+(\w+(?:\s+\w+)*)/gi);
      if (carriesMatches) {
        carriesMatches.forEach((match, index) => {
          const parts = match.split(/\s+(?:carries|equipped with|has)\s+/i);
          if (parts.length === 2) {
            relationships.push({
              id: `rel_carries_${index}_${Date.now()}`,
              source: `satellite_${parts[0].toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              target: `sensor_${parts[1].toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              type: 'carries',
              confidence: 0.8,
              evidence: [match],
              sourceUrls: [result.url]
            });
          }
        });
      }
    });
    
    return relationships;
  }

  private getContext(text: string, term: string, contextLength: number = 100): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + term.length + contextLength);
    
    return text.substring(start, end).trim();
  }

  getResults(): CrawlResult[] {
    return this.results;
  }
}

export default new CrawlerService();