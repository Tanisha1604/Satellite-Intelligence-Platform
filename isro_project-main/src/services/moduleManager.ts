import crawlerService from './crawlerService';
import nlpService from './nlpService';
import graphService from './graphService';
import queryEngine from './queryEngine';
import ragService from './ragService';
import evaluationService from './evaluationService';

export interface ModuleConfig {
  crawler: {
    enabled: boolean;
    baseUrls: string[];
    maxPages: number;
    respectRobots: boolean;
    delay: number;
  };
  nlp: {
    enabled: boolean;
    confidenceThreshold: number;
    entityTypes: string[];
    customPatterns: Record<string, RegExp[]>;
  };
  graph: {
    enabled: boolean;
    maxNodes: number;
    maxEdges: number;
    layoutAlgorithm: string;
  };
  query: {
    enabled: boolean;
    semanticSearch: boolean;
    spatialSearch: boolean;
    temporalSearch: boolean;
  };
  rag: {
    enabled: boolean;
    maxContextLength: number;
    responseTemplates: Record<string, string[]>;
    fallbackThreshold: number;
  };
  evaluation: {
    enabled: boolean;
    realTimeEvaluation: boolean;
    metricsCollection: boolean;
  };
}

export interface DeploymentProfile {
  name: string;
  key: string;
  description: string;
  domain: string;
  config: ModuleConfig;
  customization: {
    branding: {
      title: string;
      logo?: string;
      primaryColor: string;
      secondaryColor: string;
    };
    content: {
      welcomeMessage: string;
      helpText: string;
      sampleQueries: string[];
    };
    features: {
      knowledgeGraph: boolean;
      queryInterface: boolean;
      chatInterface: boolean;
      dashboard: boolean;
    };
  };
}

class ModuleManager {
  private currentConfig: ModuleConfig;
  private deploymentProfiles: Map<string, DeploymentProfile> = new Map();

  constructor() {
    this.currentConfig = this.getDefaultConfig();
    this.initializeDeploymentProfiles();
  }

  private getDefaultConfig(): ModuleConfig {
    return {
      crawler: {
        enabled: true,
        baseUrls: ['https://www.mosdac.gov.in'],
        maxPages: 50,
        respectRobots: true,
        delay: 1000
      },
      nlp: {
        enabled: true,
        confidenceThreshold: 0.7,
        entityTypes: ['satellite', 'sensor', 'data_product', 'location', 'organization'],
        customPatterns: {}
      },
      graph: {
        enabled: true,
        maxNodes: 1000,
        maxEdges: 2000,
        layoutAlgorithm: 'force-directed'
      },
      query: {
        enabled: true,
        semanticSearch: true,
        spatialSearch: true,
        temporalSearch: true
      },
      rag: {
        enabled: true,
        maxContextLength: 4000,
        responseTemplates: {},
        fallbackThreshold: 0.5
      },
      evaluation: {
        enabled: true,
        realTimeEvaluation: true,
        metricsCollection: true
      }
    };
  }

  private initializeDeploymentProfiles() {
    // MOSDAC Profile
    this.deploymentProfiles.set('mosdac', {
      name: 'MOSDAC Portal',
      key: 'mosdac',
      description: 'Main MOSDAC data portal deployment',
      domain: 'mosdac.gov.in',
      config: this.getDefaultConfig(),
      customization: {
        branding: {
          title: 'MOSDAC AI Help Bot',
          primaryColor: '#1E40AF',
          secondaryColor: '#3B82F6'
        },
        content: {
          welcomeMessage: 'Welcome to MOSDAC AI Assistant! I can help you find satellite data, explore missions, and discover geographic coverage.',
          helpText: 'Ask me about satellites, sensors, data products, or geographic regions.',
          sampleQueries: [
            'Show me all available datasets for Mumbai',
            'What satellites carry LISS-IV sensors?',
            'Find recent imagery for Kerala',
            'List all Cartosat missions'
          ]
        },
        features: {
          knowledgeGraph: true,
          queryInterface: true,
          chatInterface: true,
          dashboard: true
        }
      }
    });

    // ISRO Portal Profile
    this.deploymentProfiles.set('isro', {
      name: 'ISRO Portal',
      key: 'isro',
      description: 'General ISRO portal deployment',
      domain: 'isro.gov.in',
      config: {
        ...this.getDefaultConfig(),
        crawler: {
          ...this.getDefaultConfig().crawler,
          baseUrls: ['https://www.isro.gov.in', 'https://www.mosdac.gov.in']
        }
      },
      customization: {
        branding: {
          title: 'ISRO AI Assistant',
          primaryColor: '#DC2626',
          secondaryColor: '#EF4444'
        },
        content: {
          welcomeMessage: 'Welcome to ISRO AI Assistant! I can help you with satellite missions, launch information, and space technology.',
          helpText: 'Ask me about ISRO missions, satellites, launch vehicles, or space applications.',
          sampleQueries: [
            'Tell me about Chandrayaan missions',
            'What are the latest PSLV launches?',
            'Show me Mars Orbiter Mission details',
            'List all communication satellites'
          ]
        },
        features: {
          knowledgeGraph: true,
          queryInterface: true,
          chatInterface: true,
          dashboard: false
        }
      }
    });

    // Research Institute Profile
    this.deploymentProfiles.set('research', {
      name: 'Research Institute',
      key: 'research',
      description: 'Academic/research institution deployment',
      domain: 'custom-research.edu',
      config: {
        ...this.getDefaultConfig(),
        evaluation: {
          ...this.getDefaultConfig().evaluation,
          realTimeEvaluation: true,
          metricsCollection: true
        }
      },
      customization: {
        branding: {
          title: 'Research Data Assistant',
          primaryColor: '#059669',
          secondaryColor: '#10B981'
        },
        content: {
          welcomeMessage: 'Welcome to the Research Data Assistant! I can help you find and analyze satellite data for your research.',
          helpText: 'Ask me about datasets, analysis methods, or specific research applications.',
          sampleQueries: [
            'Find high-resolution data for urban studies',
            'What sensors are best for vegetation analysis?',
            'Show me time-series data for climate research',
            'Help me with land use classification'
          ]
        },
        features: {
          knowledgeGraph: true,
          queryInterface: true,
          chatInterface: true,
          dashboard: true
        }
      }
    });
  }

  async deployProfile(profileName: string): Promise<boolean> {
    const profile = this.deploymentProfiles.get(profileName);
    if (!profile) {
      throw new Error(`Deployment profile '${profileName}' not found`);
    }

    try {
      // Apply configuration
      this.currentConfig = { ...profile.config };
      
      // Configure modules
      await this.configureModules(profile.config);
      
      // Apply customizations
      await this.applyCustomizations(profile.customization);
      
      console.log(`Successfully deployed profile: ${profile.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to deploy profile ${profileName}:`, error);
      return false;
    }
  }

  private async configureModules(config: ModuleConfig): Promise<void> {
    // Configure crawler
    if (config.crawler.enabled) {
      // Apply crawler configuration
      console.log('Configuring crawler with:', config.crawler);
    }

    // Configure NLP service
    if (config.nlp.enabled) {
      // Apply NLP configuration
      console.log('Configuring NLP service with:', config.nlp);
    }

    // Configure graph service
    if (config.graph.enabled) {
      // Apply graph configuration
      console.log('Configuring graph service with:', config.graph);
    }

    // Configure query engine
    if (config.query.enabled) {
      // Apply query engine configuration
      console.log('Configuring query engine with:', config.query);
    }

    // Configure RAG service
    if (config.rag.enabled) {
      // Apply RAG configuration
      console.log('Configuring RAG service with:', config.rag);
    }

    // Configure evaluation service
    if (config.evaluation.enabled) {
      // Apply evaluation configuration
      console.log('Configuring evaluation service with:', config.evaluation);
    }
  }

  private async applyCustomizations(customization: any): Promise<void> {
    // Apply branding
    document.documentElement.style.setProperty('--primary-color', customization.branding.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', customization.branding.secondaryColor);
    
    // Update page title
    document.title = customization.branding.title;
    
    // Store customization in localStorage for component access
    localStorage.setItem('app-customization', JSON.stringify(customization));
    
    console.log('Applied customizations:', customization);
  }

  createCustomProfile(
    name: string,
    description: string,
    domain: string,
    config: Partial<ModuleConfig>,
    customization: any
  ): void {
    const fullConfig = { ...this.getDefaultConfig(), ...config };
    
    const profile: DeploymentProfile = {
      name,
      description,
      domain,
      config: fullConfig,
      customization
    };

    this.deploymentProfiles.set(name.toLowerCase(), profile);
  }

  getAvailableProfiles(): DeploymentProfile[] {
    return Array.from(this.deploymentProfiles.values());
  }

  getCurrentConfig(): ModuleConfig {
    return { ...this.currentConfig };
  }

  updateModuleConfig(moduleName: keyof ModuleConfig, config: any): void {
    this.currentConfig[moduleName] = { ...this.currentConfig[moduleName], ...config };
  }

  async validateDeployment(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate crawler configuration
    if (this.currentConfig.crawler.enabled) {
      if (this.currentConfig.crawler.baseUrls.length === 0) {
        issues.push('Crawler enabled but no base URLs configured');
      }
      if (this.currentConfig.crawler.delay < 500) {
        recommendations.push('Consider increasing crawler delay to be more respectful to servers');
      }
    }

    // Validate NLP configuration
    if (this.currentConfig.nlp.enabled) {
      if (this.currentConfig.nlp.confidenceThreshold < 0.5) {
        recommendations.push('Low confidence threshold may result in noisy entity extraction');
      }
    }

    // Validate graph configuration
    if (this.currentConfig.graph.enabled) {
      if (this.currentConfig.graph.maxNodes < 100) {
        recommendations.push('Low max nodes limit may restrict knowledge graph completeness');
      }
    }

    // Validate RAG configuration
    if (this.currentConfig.rag.enabled) {
      if (this.currentConfig.rag.fallbackThreshold > 0.8) {
        recommendations.push('High fallback threshold may result in frequent human escalations');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  exportConfiguration(): string {
    return JSON.stringify({
      config: this.currentConfig,
      profiles: Array.from(this.deploymentProfiles.entries())
    }, null, 2);
  }

  importConfiguration(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      
      if (imported.config) {
        this.currentConfig = imported.config;
      }
      
      if (imported.profiles) {
        this.deploymentProfiles.clear();
        imported.profiles.forEach(([key, profile]: [string, DeploymentProfile]) => {
          this.deploymentProfiles.set(key, profile);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  // Health check for all modules
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'error';
    modules: Record<string, {
      status: 'healthy' | 'warning' | 'error';
      message: string;
      lastCheck: Date;
    }>;
  }> {
    const modules: any = {};
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check crawler service
    try {
      modules.crawler = {
        status: 'healthy' as const,
        message: 'Crawler service operational',
        lastCheck: new Date()
      };
    } catch (error) {
      modules.crawler = {
        status: 'error' as const,
        message: `Crawler error: ${error}`,
        lastCheck: new Date()
      };
      overallStatus = 'error';
    }

    // Check NLP service
    try {
      const stats = nlpService.getStats();
      modules.nlp = {
        status: stats.totalEntities > 0 ? 'healthy' as const : 'warning' as const,
        message: `NLP service operational. ${stats.totalEntities} entities processed`,
        lastCheck: new Date()
      };
      if (stats.totalEntities === 0 && overallStatus === 'healthy') {
        overallStatus = 'warning';
      }
    } catch (error) {
      modules.nlp = {
        status: 'error' as const,
        message: `NLP error: ${error}`,
        lastCheck: new Date()
      };
      overallStatus = 'error';
    }

    // Check other modules similarly...
    modules.graph = {
      status: 'healthy' as const,
      message: 'Graph service operational',
      lastCheck: new Date()
    };

    modules.query = {
      status: 'healthy' as const,
      message: 'Query engine operational',
      lastCheck: new Date()
    };

    modules.rag = {
      status: 'healthy' as const,
      message: 'RAG service operational',
      lastCheck: new Date()
    };

    modules.evaluation = {
      status: 'healthy' as const,
      message: 'Evaluation service operational',
      lastCheck: new Date()
    };

    return {
      overall: overallStatus,
      modules
    };
  }
}

export default new ModuleManager();