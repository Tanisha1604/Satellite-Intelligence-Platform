// Health monitoring service for system components
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  lastCheck: Date;
  metrics?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  components: ComponentHealth[];
  lastFullCheck: Date;
  uptime: number;
}

class HealthService {
  private healthHistory: SystemHealth[] = [];
  private startTime = Date.now();

  async performFullHealthCheck(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check Frontend UI
    const uiHealth = await this.checkUIHealth();
    components.push(uiHealth);
    if (uiHealth.status === 'error') overallStatus = 'error';
    else if (uiHealth.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    // Check Knowledge Base
    const kbHealth = await this.checkKnowledgeBaseHealth();
    components.push(kbHealth);
    if (kbHealth.status === 'error') overallStatus = 'error';
    else if (kbHealth.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    // Check Data Ingestion
    const ingestionHealth = await this.checkDataIngestionHealth();
    components.push(ingestionHealth);
    if (ingestionHealth.status === 'error') overallStatus = 'error';
    else if (ingestionHealth.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    // Check Query Engine
    const queryHealth = await this.checkQueryEngineHealth();
    components.push(queryHealth);
    if (queryHealth.status === 'error') overallStatus = 'error';
    else if (queryHealth.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    // Check Chat Interface
    const chatHealth = await this.checkChatInterfaceHealth();
    components.push(chatHealth);
    if (chatHealth.status === 'error') overallStatus = 'error';
    else if (chatHealth.status === 'warning' && overallStatus === 'healthy') overallStatus = 'warning';

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      components,
      lastFullCheck: new Date(),
      uptime: Date.now() - this.startTime
    };

    this.healthHistory.push(systemHealth);
    
    // Keep only last 100 health checks
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    return systemHealth;
  }

  private async checkUIHealth(): Promise<ComponentHealth> {
    try {
      // Check if DOM is accessible and React is running
      const isReactRunning = document.getElementById('root')?.children.length > 0;
      const hasErrors = document.querySelectorAll('[data-error]').length > 0;

      if (!isReactRunning) {
        return {
          name: 'Frontend UI',
          status: 'error',
          message: 'React application not properly mounted',
          lastCheck: new Date()
        };
      }

      if (hasErrors) {
        return {
          name: 'Frontend UI',
          status: 'warning',
          message: 'UI errors detected',
          lastCheck: new Date()
        };
      }

      return {
        name: 'Frontend UI',
        status: 'healthy',
        message: 'UI components loaded and functional',
        lastCheck: new Date(),
        metrics: {
          domNodes: document.querySelectorAll('*').length,
          hasErrors: hasErrors
        }
      };
    } catch (error) {
      return {
        name: 'Frontend UI',
        status: 'error',
        message: `UI health check failed: ${error}`,
        lastCheck: new Date()
      };
    }
  }

  private async checkKnowledgeBaseHealth(): Promise<ComponentHealth> {
    try {
      // Import services dynamically to avoid circular dependencies
      const { default: localDatabase } = await import('./localDatabase');
      
      const stats = await localDatabase.getStats();

      const hasEntities = stats.totalEntities > 0;
      const hasFAQs = stats.totalFAQs > 0;

      if (!hasEntities && !hasFAQs) {
        return {
          name: 'Knowledge Base',
          status: 'error',
          message: 'No knowledge data available in local database',
          lastCheck: new Date()
        };
      }

      if (!hasEntities || !hasFAQs) {
        return {
          name: 'Knowledge Base',
          status: 'warning',
          message: 'Partial knowledge data available in local database',
          lastCheck: new Date(),
          metrics: {
            entities: stats.totalEntities,
            faqs: stats.totalFAQs,
            lastUpdated: stats.lastUpdated
          }
        };
      }

      return {
        name: 'Knowledge Base',
        status: 'healthy',
        message: 'Local knowledge base fully populated',
        lastCheck: new Date(),
        metrics: {
          entities: stats.totalEntities,
          faqs: stats.totalFAQs,
          lastUpdated: stats.lastUpdated
        }
      };
    } catch (error) {
      return {
        name: 'Knowledge Base',
        status: 'error',
        message: `Knowledge base check failed: ${error}`,
        lastCheck: new Date()
      };
    }
  }

  private async checkDataIngestionHealth(): Promise<ComponentHealth> {
    try {
      const { default: crawlerService } = await import('./crawlerService');
      
      const results = crawlerService.getResults();
      const hasData = results.length > 0;

      if (!hasData) {
        return {
          name: 'Data Ingestion',
          status: 'warning',
          message: 'No crawled data available - run knowledge graph construction',
          lastCheck: new Date()
        };
      }

      return {
        name: 'Data Ingestion',
        status: 'healthy',
        message: 'Data ingestion completed successfully',
        lastCheck: new Date(),
        metrics: {
          documentsProcessed: results.length,
          lastCrawl: results[0]?.timestamp
        }
      };
    } catch (error) {
      return {
        name: 'Data Ingestion',
        status: 'error',
        message: `Data ingestion check failed: ${error}`,
        lastCheck: new Date()
      };
    }
  }

  private async checkQueryEngineHealth(): Promise<ComponentHealth> {
    try {
      // Test query engine with a simple query
      const { default: queryEngine } = await import('./queryEngine');
      
      const testResult = await queryEngine.processQuery('test query');
      
      return {
        name: 'Query Engine',
        status: 'healthy',
        message: 'Query engine responding normally',
        lastCheck: new Date(),
        metrics: {
          testQueryConfidence: testResult.confidence,
          entitiesFound: testResult.entities.length
        }
      };
    } catch (error) {
      return {
        name: 'Query Engine',
        status: 'error',
        message: `Query engine check failed: ${error}`,
        lastCheck: new Date()
      };
    }
  }

  private async checkChatInterfaceHealth(): Promise<ComponentHealth> {
    try {
      const { default: ragService } = await import('./ragService');
      
      // Test RAG service with a simple message
      const testResponse = await ragService.processMessage(
        'Hello', 
        'health_check_user', 
        'health_check_session'
      );

      const isWorking = testResponse.content.length > 0;

      if (!isWorking) {
        return {
          name: 'Chat Interface',
          status: 'error',
          message: 'Chat interface not responding',
          lastCheck: new Date()
        };
      }

      return {
        name: 'Chat Interface',
        status: 'healthy',
        message: 'Chat interface operational',
        lastCheck: new Date(),
        metrics: {
          responseLength: testResponse.content.length,
          hasMetadata: !!testResponse.metadata
        }
      };
    } catch (error) {
      return {
        name: 'Chat Interface',
        status: 'error',
        message: `Chat interface check failed: ${error}`,
        lastCheck: new Date()
      };
    }
  }

  getLatestHealth(): SystemHealth | null {
    return this.healthHistory.length > 0 ? this.healthHistory[this.healthHistory.length - 1] : null;
  }

  getHealthHistory(limit: number = 10): SystemHealth[] {
    return this.healthHistory.slice(-limit);
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getComponentStatus(componentName: string): ComponentHealth | null {
    const latestHealth = this.getLatestHealth();
    if (!latestHealth) return null;
    
    return latestHealth.components.find(c => c.name === componentName) || null;
  }

  isSystemHealthy(): boolean {
    const latestHealth = this.getLatestHealth();
    return latestHealth ? latestHealth.overall === 'healthy' : false;
  }

  getSystemMetrics() {
    const latestHealth = this.getLatestHealth();
    if (!latestHealth) return null;

    return {
      uptime: this.getUptimeSeconds(),
      overallStatus: latestHealth.overall,
      componentCount: latestHealth.components.length,
      healthyComponents: latestHealth.components.filter(c => c.status === 'healthy').length,
      warningComponents: latestHealth.components.filter(c => c.status === 'warning').length,
      errorComponents: latestHealth.components.filter(c => c.status === 'error').length,
      lastCheck: latestHealth.lastFullCheck
    };
  }
}

export default new HealthService();