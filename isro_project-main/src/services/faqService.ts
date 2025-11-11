// FAQ Service for MOSDAC knowledge base
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  lastUpdated: Date;
}

export interface FAQCategory {
  id: string;
  name: string;
  description: string;
  items: FAQItem[];
}

class FAQService {
  private faqData: Map<string, FAQItem> = new Map();
  private categories: Map<string, FAQCategory> = new Map();

  constructor() {
    this.initializeMOSDACFAQs();
  }

  private initializeMOSDACFAQs() {
    // Initialize with comprehensive MOSDAC FAQ data
    const mosdacFAQs: FAQItem[] = [
      {
        id: 'faq_001',
        question: 'What is MOSDAC?',
        answer: 'MOSDAC (Meteorological & Oceanographic Satellite Data Archival Centre) is a facility established by ISRO to archive, process and disseminate oceanographic and meteorological satellite data. It serves as a comprehensive repository for satellite-based observations of Earth\'s atmosphere and oceans, supporting research in weather forecasting, climate studies, oceanography, and environmental monitoring.',
        category: 'general',
        keywords: ['mosdac', 'meteorological', 'oceanographic', 'satellite data', 'isro', 'archive'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_002',
        question: 'What types of satellite data are available at MOSDAC?',
        answer: 'MOSDAC provides data from various Indian satellites including INSAT-3D, INSAT-3DR, Oceansat-2, Scatsat-1, and international satellites. Data products include sea surface temperature, ocean color, wind speed and direction, atmospheric temperature and humidity profiles, precipitation measurements, and various derived products for meteorological and oceanographic applications.',
        category: 'data_products',
        keywords: ['satellite data', 'insat-3d', 'oceansat-2', 'scatsat-1', 'sea surface temperature', 'ocean color'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_003',
        question: 'How can I access MOSDAC data?',
        answer: 'MOSDAC data can be accessed through the online data portal at www.mosdac.gov.in. Users need to register for an account to download data. The portal provides search and browse capabilities, data visualization tools, and bulk download options. Data is available in standard formats including HDF, NetCDF, and GeoTIFF.',
        category: 'data_access',
        keywords: ['data access', 'portal', 'registration', 'download', 'hdf', 'netcdf', 'geotiff'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_004',
        question: 'What is INSAT-3D and what data does it provide?',
        answer: 'INSAT-3D is a geostationary meteorological satellite equipped with an Imager and Sounder. The Imager provides multi-spectral observations in visible, near-infrared, and thermal infrared bands for weather monitoring. The Sounder measures atmospheric temperature and humidity profiles using 18 spectral channels. Data products include cloud imagery, sea surface temperature, land surface temperature, atmospheric profiles, and derived meteorological parameters.',
        category: 'satellites',
        keywords: ['insat-3d', 'geostationary', 'imager', 'sounder', 'atmospheric profiles', 'meteorological'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_005',
        question: 'What is Oceansat-2 and what applications does it support?',
        answer: 'Oceansat-2 is dedicated to oceanographic applications using the Ocean Colour Monitor (OCM) sensor. OCM provides multi-spectral observations optimized for detecting phytoplankton, suspended sediments, and dissolved organic matter in marine environments. Applications include water quality monitoring, harmful algal bloom detection, coastal zone management, fisheries support, and marine ecosystem studies.',
        category: 'satellites',
        keywords: ['oceansat-2', 'ocean colour monitor', 'ocm', 'phytoplankton', 'water quality', 'coastal monitoring'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_006',
        question: 'What is Scatsat-1 and how does it measure ocean winds?',
        answer: 'Scatsat-1 is a dedicated scatterometer mission for measuring ocean surface wind vectors. It carries a Ku-band scatterometer operating at 13.515 GHz with dual polarization. The instrument measures normalized radar cross-section of the ocean surface, which is processed to derive wind speed and direction with high accuracy. It provides global ocean wind observations supporting weather prediction and marine applications.',
        category: 'satellites',
        keywords: ['scatsat-1', 'scatterometer', 'ocean winds', 'ku-band', 'wind vectors', 'weather prediction'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_007',
        question: 'What data formats are available and how do I process them?',
        answer: 'MOSDAC provides data in standard scientific formats including HDF4, HDF5, NetCDF, and GeoTIFF. Processing tools and software libraries are available for different programming languages including Python, MATLAB, and IDL. Documentation and tutorials are provided to help users understand data structure, calibration procedures, and processing workflows.',
        category: 'data_processing',
        keywords: ['data formats', 'hdf', 'netcdf', 'geotiff', 'processing', 'python', 'matlab'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_008',
        question: 'Are there any restrictions on data usage?',
        answer: 'MOSDAC data is generally available for research, educational, and operational use. Users must register and agree to the data usage policy. Commercial use may require special permissions. Proper attribution to ISRO/MOSDAC is required in publications and presentations. Some near real-time data may have restricted access for operational users.',
        category: 'data_policy',
        keywords: ['data usage', 'restrictions', 'research', 'commercial use', 'attribution', 'policy'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_009',
        question: 'How often is the data updated?',
        answer: 'Data update frequency varies by satellite and product type. INSAT-3D provides near real-time data with updates every 30 minutes to 3 hours. Oceansat-2 data is processed and made available within 24-48 hours. Scatsat-1 wind products are available within 3-6 hours. Historical data archives are continuously maintained and quality-controlled.',
        category: 'data_availability',
        keywords: ['data updates', 'frequency', 'real-time', 'processing time', 'historical data'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_010',
        question: 'What technical support is available for users?',
        answer: 'MOSDAC provides comprehensive user support including documentation, tutorials, training workshops, and helpdesk services. Technical support covers data access issues, format questions, processing guidance, and application development. Regular user meetings and feedback sessions help improve services and address user requirements.',
        category: 'support',
        keywords: ['technical support', 'documentation', 'tutorials', 'training', 'helpdesk', 'user support'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_011',
        question: 'Can I get historical data for climate studies?',
        answer: 'Yes, MOSDAC maintains extensive historical archives suitable for climate research. Long-term datasets include multi-year time series of sea surface temperature, ocean color, atmospheric parameters, and wind measurements. Climate data records are processed with consistent algorithms and quality control procedures to ensure temporal stability for trend analysis.',
        category: 'climate_data',
        keywords: ['historical data', 'climate studies', 'time series', 'climate data records', 'trend analysis'],
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'faq_012',
        question: 'What geographic coverage is provided by MOSDAC satellites?',
        answer: 'MOSDAC satellites provide comprehensive coverage of the Indian Ocean region and beyond. INSAT-3D covers the full Earth disk from geostationary orbit with focus on the Indian subcontinent. Oceansat-2 provides global ocean coverage with daily revisit capability. Scatsat-1 offers global ocean wind measurements with 2-day repeat coverage.',
        category: 'coverage',
        keywords: ['geographic coverage', 'indian ocean', 'global coverage', 'revisit', 'indian subcontinent'],
        lastUpdated: new Date('2024-01-15')
      }
    ];

    // Organize FAQs by category
    const categoryMap = new Map<string, FAQItem[]>();
    mosdacFAQs.forEach(faq => {
      this.faqData.set(faq.id, faq);
      
      if (!categoryMap.has(faq.category)) {
        categoryMap.set(faq.category, []);
      }
      categoryMap.get(faq.category)!.push(faq);
    });

    // Create category objects
    const categoryDefinitions = [
      { id: 'general', name: 'General Information', description: 'Basic information about MOSDAC' },
      { id: 'data_products', name: 'Data Products', description: 'Available satellite data and products' },
      { id: 'data_access', name: 'Data Access', description: 'How to access and download data' },
      { id: 'satellites', name: 'Satellites & Sensors', description: 'Information about satellite missions' },
      { id: 'data_processing', name: 'Data Processing', description: 'Processing tools and formats' },
      { id: 'data_policy', name: 'Data Policy', description: 'Usage policies and restrictions' },
      { id: 'data_availability', name: 'Data Availability', description: 'Update schedules and availability' },
      { id: 'support', name: 'User Support', description: 'Technical support and assistance' },
      { id: 'climate_data', name: 'Climate Data', description: 'Historical data for climate research' },
      { id: 'coverage', name: 'Geographic Coverage', description: 'Spatial coverage information' }
    ];

    categoryDefinitions.forEach(catDef => {
      const category: FAQCategory = {
        ...catDef,
        items: categoryMap.get(catDef.id) || []
      };
      this.categories.set(catDef.id, category);
    });
  }

  searchFAQs(query: string): FAQItem[] {
    const queryLower = query.toLowerCase();
    const results: { faq: FAQItem; score: number }[] = [];

    this.faqData.forEach(faq => {
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

  getFAQById(id: string): FAQItem | undefined {
    return this.faqData.get(id);
  }

  getFAQsByCategory(categoryId: string): FAQItem[] {
    const category = this.categories.get(categoryId);
    return category ? category.items : [];
  }

  getAllCategories(): FAQCategory[] {
    return Array.from(this.categories.values());
  }

  getAllFAQs(): FAQItem[] {
    return Array.from(this.faqData.values());
  }

  addFAQ(faq: Omit<FAQItem, 'id' | 'lastUpdated'>): string {
    const id = `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFAQ: FAQItem = {
      ...faq,
      id,
      lastUpdated: new Date()
    };

    this.faqData.set(id, newFAQ);

    // Add to category
    const category = this.categories.get(faq.category);
    if (category) {
      category.items.push(newFAQ);
    }

    return id;
  }

  updateFAQ(id: string, updates: Partial<Omit<FAQItem, 'id'>>): boolean {
    const faq = this.faqData.get(id);
    if (!faq) return false;

    const updatedFAQ = {
      ...faq,
      ...updates,
      lastUpdated: new Date()
    };

    this.faqData.set(id, updatedFAQ);

    // Update in category
    const category = this.categories.get(updatedFAQ.category);
    if (category) {
      const index = category.items.findIndex(item => item.id === id);
      if (index !== -1) {
        category.items[index] = updatedFAQ;
      }
    }

    return true;
  }

  deleteFAQ(id: string): boolean {
    const faq = this.faqData.get(id);
    if (!faq) return false;

    this.faqData.delete(id);

    // Remove from category
    const category = this.categories.get(faq.category);
    if (category) {
      category.items = category.items.filter(item => item.id !== id);
    }

    return true;
  }

  getStats() {
    return {
      totalFAQs: this.faqData.size,
      totalCategories: this.categories.size,
      categoryCounts: Array.from(this.categories.entries()).map(([id, category]) => ({
        category: category.name,
        count: category.items.length
      }))
    };
  }
}

export default new FAQService();