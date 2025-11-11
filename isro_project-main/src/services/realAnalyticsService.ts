// Real analytics service for production monitoring
export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  queries: QueryAnalytics[];
  userAgent: string;
  ipAddress?: string;
  location?: string;
}

export interface QueryAnalytics {
  queryId: string;
  sessionId: string;
  query: string;
  timestamp: Date;
  responseTime: number;
  confidence: number;
  entitiesFound: number;
  relationshipsFound: number;
  spatialMatches: number;
  userSatisfaction?: number; // 1-5 rating
  followUpQueries: string[];
  errorOccurred: boolean;
  errorType?: string;
  fallbackUsed: boolean;
  lyzrUsed: boolean;
}

export interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  totalQueries: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  knowledgeBaseSize: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
}

export interface PerformanceTrends {
  timeRange: string;
  dataPoints: {
    timestamp: Date;
    responseTime: number;
    accuracy: number;
    userSatisfaction: number;
    queryVolume: number;
  }[];
}

export interface RealTimeAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  resolved: boolean;
  resolvedAt?: Date;
}

class RealAnalyticsService {
  private sessions: Map<string, UserSession> = new Map();
  private queries: QueryAnalytics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private alerts: RealTimeAlert[] = [];
  private metricsInterval?: NodeJS.Timeout;

  constructor() {
    this.startMetricsCollection();
    this.loadStoredData();
  }

  // Start real-time metrics collection
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Collect every 30 seconds
  }

  // Load stored analytics data
  private loadStoredData(): void {
    try {
      const storedSessions = localStorage.getItem('analytics_sessions');
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        Object.entries(sessions).forEach(([key, value]: [string, any]) => {
          this.sessions.set(key, {
            ...value,
            startTime: new Date(value.startTime),
            endTime: value.endTime ? new Date(value.endTime) : undefined,
            queries: value.queries.map((q: any) => ({
              ...q,
              timestamp: new Date(q.timestamp)
            }))
          });
        });
      }

      const storedQueries = localStorage.getItem('analytics_queries');
      if (storedQueries) {
        this.queries = JSON.parse(storedQueries).map((q: any) => ({
          ...q,
          timestamp: new Date(q.timestamp)
        }));
      }

      const storedMetrics = localStorage.getItem('analytics_metrics');
      if (storedMetrics) {
        this.systemMetrics = JSON.parse(storedMetrics).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }

      console.log(`Loaded analytics data: ${this.sessions.size} sessions, ${this.queries.length} queries, ${this.systemMetrics.length} metrics`);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  }

  // Save analytics data to storage
  private saveData(): void {
    try {
      // Convert sessions to plain objects for storage
      const sessionsObj = Object.fromEntries(this.sessions.entries());
      localStorage.setItem('analytics_sessions', JSON.stringify(sessionsObj));
      
      localStorage.setItem('analytics_queries', JSON.stringify(this.queries));
      localStorage.setItem('analytics_metrics', JSON.stringify(this.systemMetrics));
    } catch (error) {
      console.error('Error saving analytics data:', error);
    }
  }

  // Track user session
  startSession(userId: string, userAgent: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: UserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      queries: [],
      userAgent,
      location: this.detectUserLocation()
    };

    this.sessions.set(sessionId, session);
    this.saveData();
    
    console.log(`Started session ${sessionId} for user ${userId}`);
    return sessionId;
  }

  // End user session
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date();
      this.saveData();
      console.log(`Ended session ${sessionId}`);
    }
  }

  // Track query analytics
  trackQuery(
    query: string,
    userId: string
  ): Promise<string>;
  trackQuery(
    sessionId: string,
    query: string,
    responseTime: number,
    confidence: number,
    entitiesFound: number,
    relationshipsFound: number,
    spatialMatches: number,
    errorOccurred: boolean = false,
    errorType?: string,
    fallbackUsed: boolean = false,
    lyzrUsed: boolean = false
  ): string;
  trackQuery(...args: any[]): Promise<string> | string {
    // Handle both overloads
    if (args.length === 2) {
      // Simple tracking overload
      const [query, userId] = args;
      return Promise.resolve(this.trackQuerySimple(query, userId));
    } else {
      // Full tracking overload
      return this.trackQueryFull(...args);
    }
  }

  private trackQuerySimple(query: string, userId: string): string {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Tracking query: ${query} for user: ${userId}`);
    return queryId;
  }

  private trackQueryFull(
    sessionId: string,
    query: string,
    responseTime: number,
    confidence: number,
    entitiesFound: number,
    relationshipsFound: number,
    spatialMatches: number,
    errorOccurred: boolean = false,
    errorType?: string,
    fallbackUsed: boolean = false,
    lyzrUsed: boolean = false
  ): string {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queryAnalytics: QueryAnalytics = {
      queryId,
      sessionId,
      query,
      timestamp: new Date(),
      responseTime,
      confidence,
      entitiesFound,
      relationshipsFound,
      spatialMatches,
      followUpQueries: [],
      errorOccurred,
      errorType,
      fallbackUsed,
      lyzrUsed
    };

    this.queries.push(queryAnalytics);

    // Add to session
    const session = this.sessions.get(sessionId);
    if (session) {
      session.queries.push(queryAnalytics);
    }

    // Check for performance issues
    this.checkPerformanceAlerts(queryAnalytics);

    this.saveData();
    return queryId;
  }

  // Track response analytics
  async trackResponse(confidence: number, sourcesCount: number): Promise<void> {
    console.log(`Tracking response: confidence=${confidence}, sources=${sourcesCount}`);
  }

  // Track user satisfaction
  trackUserSatisfaction(queryId: string, rating: number): void {
    const query = this.queries.find(q => q.queryId === queryId);
    if (query) {
      query.userSatisfaction = rating;
      this.saveData();
    }
  }

  // Collect real system metrics
  private collectSystemMetrics(): void {
    const metrics: SystemMetrics = {
      timestamp: new Date(),
      activeUsers: this.getActiveUsersCount(),
      totalQueries: this.queries.length,
      averageResponseTime: this.calculateAverageResponseTime(),
      successRate: this.calculateSuccessRate(),
      errorRate: this.calculateErrorRate(),
      knowledgeBaseSize: this.getKnowledgeBaseSize(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      networkLatency: this.getNetworkLatency()
    };

    this.systemMetrics.push(metrics);

    // Keep only last 1000 metrics (about 8 hours at 30s intervals)
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(-1000);
    }

    // Check for system alerts
    this.checkSystemAlerts(metrics);

    this.saveData();
  }

  private getActiveUsersCount(): number {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const activeSessions = Array.from(this.sessions.values()).filter(session => {
      const lastActivity = session.queries.length > 0 
        ? session.queries[session.queries.length - 1].timestamp
        : session.startTime;
      return lastActivity > fiveMinutesAgo && !session.endTime;
    });

    return activeSessions.length;
  }

  private calculateAverageResponseTime(): number {
    const recentQueries = this.getRecentQueries(60); // Last hour
    if (recentQueries.length === 0) return 0;
    
    const totalTime = recentQueries.reduce((sum, q) => sum + q.responseTime, 0);
    return totalTime / recentQueries.length;
  }

  private calculateSuccessRate(): number {
    const recentQueries = this.getRecentQueries(60);
    if (recentQueries.length === 0) return 100;
    
    const successfulQueries = recentQueries.filter(q => !q.errorOccurred);
    return (successfulQueries.length / recentQueries.length) * 100;
  }

  private calculateErrorRate(): number {
    return 100 - this.calculateSuccessRate();
  }

  private getKnowledgeBaseSize(): number {
    try {
      const kbData = localStorage.getItem('knowledge_base');
      if (kbData) {
        const kb = JSON.parse(kbData);
        return (kb.entities?.length || 0) + (kb.relationships?.length || 0) + (kb.faqs?.length || 0);
      }
    } catch (e) {
      // Ignore errors
    }
    return 0;
  }

  private getMemoryUsage(): number {
    // Browser memory usage estimation
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  }

  private getCpuUsage(): number {
    // Simplified CPU usage estimation based on recent response times
    const avgResponseTime = this.calculateAverageResponseTime();
    return Math.min((avgResponseTime / 5000) * 100, 100); // Normalize to 0-100%
  }

  private getNetworkLatency(): number {
    // Estimate network latency based on recent API calls
    const recentQueries = this.getRecentQueries(10);
    const lyzrQueries = recentQueries.filter(q => q.lyzrUsed);
    
    if (lyzrQueries.length === 0) return 0;
    
    const avgLyzrTime = lyzrQueries.reduce((sum, q) => sum + q.responseTime, 0) / lyzrQueries.length;
    return Math.max(avgLyzrTime - 1000, 0); // Subtract processing time estimate
  }

  private getRecentQueries(minutes: number): QueryAnalytics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.queries.filter(q => q.timestamp > cutoff);
  }

  // Performance monitoring and alerts
  private checkPerformanceAlerts(query: QueryAnalytics): void {
    // Slow response alert
    if (query.responseTime > 10000) {
      this.createAlert('warning', `Slow query response: ${query.responseTime}ms`, 'medium', 'query_engine');
    }

    // Low confidence alert
    if (query.confidence < 0.3 && !query.fallbackUsed) {
      this.createAlert('warning', `Low confidence query: ${query.confidence}`, 'medium', 'nlp_engine');
    }

    // Error alert
    if (query.errorOccurred) {
      this.createAlert('error', `Query error: ${query.errorType || 'Unknown'}`, 'high', 'system');
    }
  }

  private checkSystemAlerts(metrics: SystemMetrics): void {
    // High error rate alert
    if (metrics.errorRate > 10) {
      this.createAlert('error', `High error rate: ${metrics.errorRate.toFixed(1)}%`, 'high', 'system');
    }

    // Slow average response time
    if (metrics.averageResponseTime > 5000) {
      this.createAlert('warning', `Slow average response time: ${metrics.averageResponseTime}ms`, 'medium', 'performance');
    }

    // High memory usage
    if (metrics.memoryUsage > 80) {
      this.createAlert('warning', `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`, 'medium', 'system');
    }
  }

  private createAlert(type: RealTimeAlert['type'], message: string, severity: RealTimeAlert['severity'], component: string): void {
    const alert: RealTimeAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      severity,
      component,
      resolved: false
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`Alert created: ${type} - ${message}`);
  }

  // Detect user location (simplified)
  private detectUserLocation(): string {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return timezone;
    } catch (e) {
      return 'Unknown';
    }
  }

  // Public API methods
  getPerformanceTrends(days: number = 7): PerformanceTrends {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentQueries = this.queries.filter(q => q.timestamp > cutoff);
    
    // Group by hour
    const hourlyData = new Map<string, QueryAnalytics[]>();
    
    recentQueries.forEach(query => {
      const hour = new Date(query.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      
      if (!hourlyData.has(key)) {
        hourlyData.set(key, []);
      }
      hourlyData.get(key)!.push(query);
    });

    const dataPoints = Array.from(hourlyData.entries()).map(([timestamp, queries]) => {
      const avgResponseTime = queries.reduce((sum, q) => sum + q.responseTime, 0) / queries.length;
      const avgAccuracy = queries.reduce((sum, q) => sum + q.confidence, 0) / queries.length;
      const avgSatisfaction = queries
        .filter(q => q.userSatisfaction !== undefined)
        .reduce((sum, q) => sum + (q.userSatisfaction || 0), 0) / 
        Math.max(queries.filter(q => q.userSatisfaction !== undefined).length, 1);

      return {
        timestamp: new Date(timestamp),
        responseTime: avgResponseTime,
        accuracy: avgAccuracy,
        userSatisfaction: avgSatisfaction,
        queryVolume: queries.length
      };
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      timeRange: `${days} days`,
      dataPoints
    };
  }

  getCurrentMetrics(): SystemMetrics | null {
    return this.systemMetrics.length > 0 ? this.systemMetrics[this.systemMetrics.length - 1] : null;
  }

  getActiveAlerts(): RealTimeAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  exportAnalyticsData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      sessions: Array.from(this.sessions.values()),
      queries: this.queries,
      metrics: this.systemMetrics,
      alerts: this.alerts,
      exportTimestamp: new Date().toISOString()
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  private convertToCSV(data: any): string {
    const csvSections: string[] = [];

    // Queries CSV
    if (data.queries.length > 0) {
      const queryHeaders = ['queryId', 'sessionId', 'query', 'timestamp', 'responseTime', 'confidence', 'entitiesFound', 'relationshipsFound', 'errorOccurred', 'lyzrUsed'];
      const queryRows = data.queries.map((q: QueryAnalytics) => [
        q.queryId,
        q.sessionId,
        `"${q.query.replace(/"/g, '""')}"`,
        q.timestamp.toISOString(),
        q.responseTime,
        q.confidence,
        q.entitiesFound,
        q.relationshipsFound,
        q.errorOccurred,
        q.lyzrUsed
      ].join(','));

      csvSections.push('QUERIES');
      csvSections.push(queryHeaders.join(','));
      csvSections.push(...queryRows);
      csvSections.push('');
    }

    // Metrics CSV
    if (data.metrics.length > 0) {
      const metricHeaders = ['timestamp', 'activeUsers', 'totalQueries', 'averageResponseTime', 'successRate', 'errorRate'];
      const metricRows = data.metrics.map((m: SystemMetrics) => [
        m.timestamp.toISOString(),
        m.activeUsers,
        m.totalQueries,
        m.averageResponseTime.toFixed(2),
        m.successRate.toFixed(2),
        m.errorRate.toFixed(2)
      ].join(','));

      csvSections.push('METRICS');
      csvSections.push(metricHeaders.join(','));
      csvSections.push(...metricRows);
    }

    return csvSections.join('\n');
  }

  // Cleanup old data
  cleanup(daysToKeep: number = 30): void {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    // Remove old queries
    this.queries = this.queries.filter(q => q.timestamp > cutoff);
    
    // Remove old metrics
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);
    
    // Remove old sessions
    this.sessions.forEach((session, sessionId) => {
      if (session.startTime < cutoff) {
        this.sessions.delete(sessionId);
      }
    });

    this.saveData();
    console.log(`Cleaned up analytics data older than ${daysToKeep} days`);
  }

  // Stop metrics collection
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

export default new RealAnalyticsService();