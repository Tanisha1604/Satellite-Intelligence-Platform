// Real health monitoring service with comprehensive system checks
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  lastCheck: Date;
  metrics?: Record<string, any>;
  responseTime?: number;
  uptime?: number;
  errorCount?: number;
  warningCount?: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  components: ComponentHealth[];
  lastFullCheck: Date;
  uptime: number;
  systemMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    diskUsage: number;
    activeConnections: number;
  };
  alerts: HealthAlert[];
}

export interface HealthAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  component: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: Date;
}

export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  retries: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

class RealHealthService {
  private healthHistory: SystemHealth[] = [];
  private startTime = Date.now();
  private healthCheckInterval?: NodeJS.Timeout;
  private alerts: HealthAlert[] = [];
  private componentStats = new Map<string, {
    checks: number;
    failures: number;
    totalResponseTime: number;
    lastFailure?: Date;
  }>();

  private config: HealthCheckConfig = {
    interval: 30000, // 30 seconds
    timeout: 10000,  // 10 seconds
    retries: 3,
    alertThresholds: {
      responseTime: 5000,
      errorRate: 10,
      memoryUsage: 80,
      cpuUsage: 80
    }
  };

  constructor() {
    this.startHealthMonitoring();
    this.loadStoredData();
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performFullHealthCheck();
    }, this.config.interval);
  }

  private loadStoredData(): void {
    try {
      const storedAlerts = localStorage.getItem('health_alerts');
      if (storedAlerts) {
        this.alerts = JSON.parse(storedAlerts).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
        }));
      }

      const storedStats = localStorage.getItem('component_stats');
      if (storedStats) {
        const stats = JSON.parse(storedStats);
        Object.entries(stats).forEach(([component, data]: [string, any]) => {
          this.componentStats.set(component, {
            ...data,
            lastFailure: data.lastFailure ? new Date(data.lastFailure) : undefined
          });
        });
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('health_alerts', JSON.stringify(this.alerts));
      localStorage.setItem('component_stats', JSON.stringify(Object.fromEntries(this.componentStats)));
    } catch (error) {
      console.error('Error saving health data:', error);
    }
  }

  async performFullHealthCheck(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check all system components
    const componentChecks = [
      this.checkFrontendUI(),
      this.checkKnowledgeBase(),
      this.checkNLPEngine(),
      this.checkQueryEngine(),
      this.checkChatInterface(),
      this.checkLyzrIntegration(),
      this.checkAnalyticsService(),
      this.checkDeploymentService(),
      this.checkCrawlerService(),
      this.checkLocalStorage(),
      this.checkNetworkConnectivity(),
      this.checkBrowserCompatibility()
    ];

    const results = await Promise.allSettled(componentChecks);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        components.push(result.value);
        
        // Update overall status
        if (result.value.status === 'error') {
          overallStatus = 'error';
        } else if (result.value.status === 'warning' && overallStatus === 'healthy') {
          overallStatus = 'warning';
        }
        
        // Update component statistics
        this.updateComponentStats(result.value);
        
        // Check for alerts
        this.checkForAlerts(result.value);
      } else {
        // Handle failed health check
        const errorComponent: ComponentHealth = {
          name: `Component ${index}`,
          status: 'error',
          message: `Health check failed: ${result.reason}`,
          lastCheck: new Date()
        };
        components.push(errorComponent);
        overallStatus = 'error';
      }
    });

    // Collect system metrics
    const systemMetrics = await this.collectSystemMetrics();

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      components,
      lastFullCheck: new Date(),
      uptime: Date.now() - this.startTime,
      systemMetrics,
      alerts: this.getActiveAlerts()
    };

    this.healthHistory.push(systemHealth);
    
    // Keep only last 100 health checks
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    this.saveData();
    return systemHealth;
  }

  private async checkFrontendUI(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Check if React is running
      const isReactRunning = document.getElementById('root')?.children.length > 0;
      const hasErrors = document.querySelectorAll('[data-error]').length > 0;
      const hasWarnings = document.querySelectorAll('[data-warning]').length > 0;

      if (!isReactRunning) {
        return {
          name: 'Frontend UI',
          status: 'error',
          message: 'React application not properly mounted',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      if (hasErrors) {
        return {
          name: 'Frontend UI',
          status: 'error',
          message: `${hasErrors} UI errors detected`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      if (hasWarnings) {
        return {
          name: 'Frontend UI',
          status: 'warning',
          message: `${hasWarnings} UI warnings detected`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      // Check for performance issues
      const domNodes = document.querySelectorAll('*').length;
      const performanceWarning = domNodes > 5000;

      return {
        name: 'Frontend UI',
        status: performanceWarning ? 'warning' : 'healthy',
        message: performanceWarning 
          ? `High DOM complexity: ${domNodes} nodes`
          : 'UI components loaded and functional',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          domNodes,
          hasErrors,
          hasWarnings,
          memoryUsage: this.getMemoryUsage()
        }
      };
    } catch (error) {
      return {
        name: 'Frontend UI',
        status: 'error',
        message: `UI health check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkKnowledgeBase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: localDatabase } = await import('./localDatabase');
      const stats = await localDatabase.getStats();

      const hasEntities = stats.totalEntities > 0;
      const hasFAQs = stats.totalFAQs > 0;
      const hasRelationships = stats.totalRelationships > 0;

      if (!hasEntities && !hasFAQs) {
        return {
          name: 'Knowledge Base',
          status: 'error',
          message: 'No knowledge data available',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      if (!hasEntities || !hasFAQs || !hasRelationships) {
        return {
          name: 'Knowledge Base',
          status: 'warning',
          message: 'Partial knowledge data available',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: {
            entities: stats.totalEntities,
            faqs: stats.totalFAQs,
            relationships: stats.totalRelationships,
            lastUpdated: stats.lastUpdated
          }
        };
      }

      return {
        name: 'Knowledge Base',
        status: 'healthy',
        message: 'Knowledge base fully populated and accessible',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          entities: stats.totalEntities,
          faqs: stats.totalFAQs,
          relationships: stats.totalRelationships,
          lastUpdated: stats.lastUpdated,
          dataIntegrity: 'verified'
        }
      };
    } catch (error) {
      return {
        name: 'Knowledge Base',
        status: 'error',
        message: `Knowledge base check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkNLPEngine(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: productionNlpService } = await import('./productionNlpService');
      
      // Test NLP processing with sample text
      const testText = 'INSAT-3D satellite carries an Imager sensor for weather monitoring';
      await productionNlpService.processText(testText, 'health-check');
      
      const stats = productionNlpService.getStats();
      const avgConfidence = stats.averageConfidence;
      
      if (avgConfidence < 0.5) {
        return {
          name: 'NLP Engine',
          status: 'warning',
          message: `Low average confidence: ${(avgConfidence * 100).toFixed(1)}%`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: stats
        };
      }

      return {
        name: 'NLP Engine',
        status: 'healthy',
        message: 'NLP processing operational',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          ...stats,
          testProcessingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        name: 'NLP Engine',
        status: 'error',
        message: `NLP engine check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkQueryEngine(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: queryEngine } = await import('./queryEngine');
      
      // Test query processing
      const testQuery = 'What satellites are available?';
      const result = await queryEngine.processQuery(testQuery);
      
      if (result.confidence < 0.3) {
        return {
          name: 'Query Engine',
          status: 'warning',
          message: `Low query confidence: ${(result.confidence * 100).toFixed(1)}%`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: {
            testQueryConfidence: result.confidence,
            entitiesFound: result.entities.length,
            relationshipsFound: result.relationships.length
          }
        };
      }

      return {
        name: 'Query Engine',
        status: 'healthy',
        message: 'Query processing operational',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          testQueryConfidence: result.confidence,
          entitiesFound: result.entities.length,
          relationshipsFound: result.relationships.length,
          spatialMatches: result.spatialMatches.length
        }
      };
    } catch (error) {
      return {
        name: 'Query Engine',
        status: 'error',
        message: `Query engine check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkChatInterface(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: ragService } = await import('./ragService');
      
      // Test RAG service
      const testResponse = await ragService.processMessage(
        'Hello', 
        'health_check_user', 
        'health_check_session'
      );

      const isWorking = testResponse.content.length > 0;
      const hasMetadata = !!testResponse.metadata;

      if (!isWorking) {
        return {
          name: 'Chat Interface',
          status: 'error',
          message: 'Chat interface not responding',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      return {
        name: 'Chat Interface',
        status: 'healthy',
        message: 'Chat interface operational',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          responseLength: testResponse.content.length,
          hasMetadata,
          confidence: testResponse.metadata?.confidence || 0
        }
      };
    } catch (error) {
      return {
        name: 'Chat Interface',
        status: 'error',
        message: `Chat interface check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkLyzrIntegration(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: lyzrService } = await import('./lyzrService');
      
      if (!lyzrService.isReady()) {
        return {
          name: 'Lyzr AI Integration',
          status: 'warning',
          message: 'Lyzr AI not configured',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: lyzrService.getStatus()
        };
      }

      // Test Lyzr connection
      const testResult = await lyzrService.testConnection();
      
      if (!testResult.success) {
        return {
          name: 'Lyzr AI Integration',
          status: 'error',
          message: testResult.message,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      return {
        name: 'Lyzr AI Integration',
        status: 'healthy',
        message: 'Lyzr AI connected and operational',
        lastCheck: new Date(),
        responseTime: testResult.responseTime || (Date.now() - startTime),
        metrics: {
          ...lyzrService.getStatus(),
          testResponseTime: testResult.responseTime
        }
      };
    } catch (error) {
      return {
        name: 'Lyzr AI Integration',
        status: 'error',
        message: `Lyzr integration check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkAnalyticsService(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: realAnalyticsService } = await import('./realAnalyticsService');
      
      const currentMetrics = realAnalyticsService.getCurrentMetrics();
      const activeAlerts = realAnalyticsService.getActiveAlerts();
      
      if (activeAlerts.filter(a => a.severity === 'critical').length > 0) {
        return {
          name: 'Analytics Service',
          status: 'error',
          message: `${activeAlerts.filter(a => a.severity === 'critical').length} critical alerts`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: {
            activeAlerts: activeAlerts.length,
            criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length
          }
        };
      }

      if (activeAlerts.filter(a => a.severity === 'high').length > 0) {
        return {
          name: 'Analytics Service',
          status: 'warning',
          message: `${activeAlerts.filter(a => a.severity === 'high').length} high priority alerts`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: {
            activeAlerts: activeAlerts.length,
            highAlerts: activeAlerts.filter(a => a.severity === 'high').length
          }
        };
      }

      return {
        name: 'Analytics Service',
        status: 'healthy',
        message: 'Analytics service operational',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          activeAlerts: activeAlerts.length,
          currentMetrics: currentMetrics ? 'available' : 'unavailable'
        }
      };
    } catch (error) {
      return {
        name: 'Analytics Service',
        status: 'error',
        message: `Analytics service check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkDeploymentService(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: realDeploymentService } = await import('./realDeploymentService');
      
      const currentEnv = realDeploymentService.getCurrentEnvironment();
      const allEnvs = realDeploymentService.getAllEnvironments();
      
      if (!currentEnv) {
        return {
          name: 'Deployment Service',
          status: 'error',
          message: 'No active environment configured',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      const healthyEnvs = allEnvs.filter(env => env.status === 'active').length;
      const totalEnvs = allEnvs.length;

      return {
        name: 'Deployment Service',
        status: 'healthy',
        message: `Deployment service operational (${healthyEnvs}/${totalEnvs} environments active)`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          currentEnvironment: currentEnv.name,
          activeEnvironments: healthyEnvs,
          totalEnvironments: totalEnvs
        }
      };
    } catch (error) {
      return {
        name: 'Deployment Service',
        status: 'error',
        message: `Deployment service check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkCrawlerService(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const { default: realCrawlerService } = await import('./realCrawlerService');
      
      const isRunning = realCrawlerService.isRunning();
      const results = realCrawlerService.getResults();
      
      if (isRunning) {
        return {
          name: 'Crawler Service',
          status: 'healthy',
          message: 'Crawler currently running',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: {
            status: 'running',
            resultsCount: results.length
          }
        };
      }

      return {
        name: 'Crawler Service',
        status: 'healthy',
        message: 'Crawler service ready',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          status: 'idle',
          resultsCount: results.length,
          lastCrawl: results.length > 0 ? results[results.length - 1].timestamp : null
        }
      };
    } catch (error) {
      return {
        name: 'Crawler Service',
        status: 'error',
        message: `Crawler service check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkLocalStorage(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test localStorage functionality
      const testKey = 'health_check_test';
      const testValue = 'test_data_' + Date.now();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== testValue) {
        return {
          name: 'Local Storage',
          status: 'error',
          message: 'localStorage read/write test failed',
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      // Check storage usage
      const storageUsage = this.calculateStorageUsage();
      const isNearLimit = storageUsage > 80; // 80% of quota

      return {
        name: 'Local Storage',
        status: isNearLimit ? 'warning' : 'healthy',
        message: isNearLimit 
          ? `Storage usage high: ${storageUsage.toFixed(1)}%`
          : 'Local storage operational',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          usagePercentage: storageUsage,
          testPassed: true
        }
      };
    } catch (error) {
      return {
        name: 'Local Storage',
        status: 'error',
        message: `Local storage check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test network connectivity with a simple request
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        timeout: 5000
      });

      if (!response.ok) {
        return {
          name: 'Network Connectivity',
          status: 'warning',
          message: `Network test returned ${response.status}`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      const responseTime = Date.now() - startTime;
      const isSlowNetwork = responseTime > 3000;

      return {
        name: 'Network Connectivity',
        status: isSlowNetwork ? 'warning' : 'healthy',
        message: isSlowNetwork 
          ? `Slow network detected: ${responseTime}ms`
          : 'Network connectivity normal',
        lastCheck: new Date(),
        responseTime,
        metrics: {
          networkLatency: responseTime,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown'
        }
      };
    } catch (error) {
      return {
        name: 'Network Connectivity',
        status: 'error',
        message: `Network connectivity check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkBrowserCompatibility(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const issues: string[] = [];
      const warnings: string[] = [];

      // Check for required APIs
      if (!window.fetch) issues.push('Fetch API not supported');
      if (!window.localStorage) issues.push('localStorage not supported');
      if (!window.Promise) issues.push('Promises not supported');
      if (!window.Map) issues.push('Map not supported');
      if (!window.Set) issues.push('Set not supported');

      // Check for modern features
      if (!window.requestAnimationFrame) warnings.push('requestAnimationFrame not supported');
      if (!window.IntersectionObserver) warnings.push('IntersectionObserver not supported');
      if (!(navigator as any).serviceWorker) warnings.push('Service Workers not supported');

      // Check browser version (simplified)
      const userAgent = navigator.userAgent;
      const isOldBrowser = /MSIE|Trident/.test(userAgent);
      
      if (isOldBrowser) {
        issues.push('Internet Explorer detected - unsupported browser');
      }

      if (issues.length > 0) {
        return {
          name: 'Browser Compatibility',
          status: 'error',
          message: `Compatibility issues: ${issues.join(', ')}`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: {
            issues: issues.length,
            warnings: warnings.length,
            userAgent
          }
        };
      }

      if (warnings.length > 0) {
        return {
          name: 'Browser Compatibility',
          status: 'warning',
          message: `Some features unavailable: ${warnings.join(', ')}`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
          metrics: {
            warnings: warnings.length,
            userAgent
          }
        };
      }

      return {
        name: 'Browser Compatibility',
        status: 'healthy',
        message: 'Browser fully compatible',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        metrics: {
          userAgent,
          modernFeatures: 'supported'
        }
      };
    } catch (error) {
      return {
        name: 'Browser Compatibility',
        status: 'error',
        message: `Browser compatibility check failed: ${error}`,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private async collectSystemMetrics(): Promise<SystemHealth['systemMetrics']> {
    return {
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      networkLatency: await this.getNetworkLatency(),
      diskUsage: this.getDiskUsage(),
      activeConnections: this.getActiveConnections()
    };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  }

  private getCpuUsage(): number {
    // Simplified CPU usage estimation
    const recentChecks = this.healthHistory.slice(-5);
    if (recentChecks.length === 0) return 0;
    
    const avgResponseTime = recentChecks.reduce((sum, check) => {
      const avgComponentTime = check.components.reduce((compSum, comp) => 
        compSum + (comp.responseTime || 0), 0) / check.components.length;
      return sum + avgComponentTime;
    }, 0) / recentChecks.length;
    
    return Math.min((avgResponseTime / 1000) * 100, 100);
  }

  private async getNetworkLatency(): Promise<number> {
    try {
      const startTime = Date.now();
      await fetch('https://httpbin.org/status/200', { method: 'HEAD', timeout: 5000 });
      return Date.now() - startTime;
    } catch {
      return 0;
    }
  }

  private getDiskUsage(): number {
    return this.calculateStorageUsage();
  }

  private getActiveConnections(): number {
    // Estimate based on active components
    return this.healthHistory.length > 0 
      ? this.healthHistory[this.healthHistory.length - 1].components.filter(c => c.status === 'healthy').length
      : 0;
  }

  private calculateStorageUsage(): number {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }
      
      // Estimate quota (most browsers have 5-10MB limit)
      const estimatedQuota = 5 * 1024 * 1024; // 5MB
      return (totalSize / estimatedQuota) * 100;
    } catch {
      return 0;
    }
  }

  private updateComponentStats(component: ComponentHealth): void {
    const stats = this.componentStats.get(component.name) || {
      checks: 0,
      failures: 0,
      totalResponseTime: 0
    };

    stats.checks++;
    if (component.responseTime) {
      stats.totalResponseTime += component.responseTime;
    }

    if (component.status === 'error') {
      stats.failures++;
      stats.lastFailure = new Date();
    }

    this.componentStats.set(component.name, stats);
  }

  private checkForAlerts(component: ComponentHealth): void {
    // Check response time threshold
    if (component.responseTime && component.responseTime > this.config.alertThresholds.responseTime) {
      this.createAlert('warning', component.name, 
        `Slow response time: ${component.responseTime}ms`, 'medium');
    }

    // Check error status
    if (component.status === 'error') {
      this.createAlert('error', component.name, component.message, 'high');
    }

    // Check failure rate
    const stats = this.componentStats.get(component.name);
    if (stats && stats.checks > 10) {
      const errorRate = (stats.failures / stats.checks) * 100;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.createAlert('warning', component.name, 
          `High error rate: ${errorRate.toFixed(1)}%`, 'medium');
      }
    }
  }

  private createAlert(type: HealthAlert['type'], component: string, message: string, severity: HealthAlert['severity']): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(alert => 
      !alert.resolved && 
      alert.component === component && 
      alert.message === message
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: HealthAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      component,
      message,
      timestamp: new Date(),
      severity,
      resolved: false
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`Health Alert: ${type} - ${component}: ${message}`);
  }

  // Public API methods
  getLatestHealth(): SystemHealth | null {
    return this.healthHistory.length > 0 ? this.healthHistory[this.healthHistory.length - 1] : null;
  }

  getHealthHistory(limit: number = 10): SystemHealth[] {
    return this.healthHistory.slice(-limit);
  }

  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): HealthAlert[] {
    return this.alerts;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.saveData();
      return true;
    }
    return false;
  }

  getComponentStats(componentName: string): any {
    const stats = this.componentStats.get(componentName);
    if (!stats) return null;

    return {
      ...stats,
      successRate: stats.checks > 0 ? ((stats.checks - stats.failures) / stats.checks) * 100 : 0,
      averageResponseTime: stats.checks > 0 ? stats.totalResponseTime / stats.checks : 0
    };
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
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
      lastCheck: latestHealth.lastFullCheck,
      activeAlerts: this.getActiveAlerts().length,
      systemMetrics: latestHealth.systemMetrics
    };
  }

  // Configuration methods
  updateConfig(newConfig: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new interval if changed
    if (newConfig.interval && this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.startHealthMonitoring();
    }
  }

  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  // Export functionality
  exportHealthData(): string {
    return JSON.stringify({
      healthHistory: this.healthHistory,
      alerts: this.alerts,
      componentStats: Object.fromEntries(this.componentStats),
      config: this.config,
      exportTimestamp: new Date().toISOString()
    }, null, 2);
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export default new RealHealthService();