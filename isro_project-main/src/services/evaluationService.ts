import { Entity, Relationship } from './nlpService';
import { QueryResult } from './queryEngine';
import { ChatMessage } from './ragService';

export interface EvaluationMetrics {
  intentRecognitionAccuracy: number;
  entityRecognitionAccuracy: number;
  responseCompleteness: number;
  responseConsistency: number;
  overallScore: number;
  timestamp: Date;
}

export interface IntentEvaluation {
  queryId: string;
  originalQuery: string;
  predictedIntent: string;
  actualIntent: string;
  isCorrect: boolean;
  confidence: number;
}

export interface EntityEvaluation {
  queryId: string;
  originalQuery: string;
  extractedEntities: Entity[];
  expectedEntities: string[];
  precision: number;
  recall: number;
  f1Score: number;
}

export interface ResponseEvaluation {
  queryId: string;
  originalQuery: string;
  response: string;
  completenessScore: number;
  consistencyScore: number;
  relevanceScore: number;
  factualAccuracy: number;
}

export interface EvaluationReport {
  sessionId: string;
  timestamp: Date;
  totalQueries: number;
  metrics: EvaluationMetrics;
  intentEvaluations: IntentEvaluation[];
  entityEvaluations: EntityEvaluation[];
  responseEvaluations: ResponseEvaluation[];
  recommendations: string[];
}

class EvaluationService {
  private evaluationHistory: EvaluationReport[] = [];
  private groundTruthData = new Map<string, {
    intent: string;
    entities: string[];
    expectedResponse: string;
  }>();

  // Initialize with ground truth data for common queries
  constructor() {
    this.initializeGroundTruth();
  }

  private initializeGroundTruth() {
    const groundTruthQueries = [
      {
        query: "show me all available datasets for mumbai",
        intent: "geospatial",
        entities: ["mumbai", "datasets"],
        expectedResponse: "spatial coverage information for Mumbai region"
      },
      {
        query: "what satellites carry liss-iv sensors",
        intent: "relationship",
        entities: ["satellites", "liss-iv", "sensors"],
        expectedResponse: "list of satellites with LISS-IV sensors"
      },
      {
        query: "find recent satellite imagery for kerala",
        intent: "temporal_geospatial",
        entities: ["satellite imagery", "kerala", "recent"],
        expectedResponse: "recent satellite imagery covering Kerala"
      },
      {
        query: "which sensors does cartosat-3 carry",
        intent: "relationship",
        entities: ["cartosat-3", "sensors"],
        expectedResponse: "sensors carried by Cartosat-3 satellite"
      },
      {
        query: "show me dem data for karnataka",
        intent: "geospatial",
        entities: ["dem", "data", "karnataka"],
        expectedResponse: "DEM data products for Karnataka region"
      }
    ];

    groundTruthQueries.forEach(item => {
      this.groundTruthData.set(item.query.toLowerCase(), {
        intent: item.intent,
        entities: item.entities,
        expectedResponse: item.expectedResponse
      });
    });
  }

  async evaluateQuery(
    queryId: string,
    originalQuery: string,
    queryResult: QueryResult,
    response: ChatMessage
  ): Promise<{
    intentEval: IntentEvaluation;
    entityEval: EntityEvaluation;
    responseEval: ResponseEvaluation;
  }> {
    const groundTruth = this.groundTruthData.get(originalQuery.toLowerCase());
    
    // Evaluate intent recognition
    const intentEval = this.evaluateIntentRecognition(
      queryId,
      originalQuery,
      queryResult,
      groundTruth?.intent
    );

    // Evaluate entity recognition
    const entityEval = this.evaluateEntityRecognition(
      queryId,
      originalQuery,
      queryResult.entities,
      groundTruth?.entities || []
    );

    // Evaluate response quality
    const responseEval = this.evaluateResponseQuality(
      queryId,
      originalQuery,
      response.content,
      groundTruth?.expectedResponse
    );

    return { intentEval, entityEval, responseEval };
  }

  private evaluateIntentRecognition(
    queryId: string,
    originalQuery: string,
    queryResult: QueryResult,
    expectedIntent?: string
  ): IntentEvaluation {
    // Infer intent from query result characteristics
    let predictedIntent = 'search';
    
    if (queryResult.spatialMatches.length > 0) {
      predictedIntent = 'geospatial';
    } else if (queryResult.relationships.length > queryResult.entities.length) {
      predictedIntent = 'relationship';
    } else if (originalQuery.toLowerCase().includes('recent') || originalQuery.toLowerCase().includes('latest')) {
      predictedIntent = 'temporal';
    }

    const isCorrect = expectedIntent ? predictedIntent === expectedIntent : true;

    return {
      queryId,
      originalQuery,
      predictedIntent,
      actualIntent: expectedIntent || 'unknown',
      isCorrect,
      confidence: queryResult.confidence
    };
  }

  private evaluateEntityRecognition(
    queryId: string,
    originalQuery: string,
    extractedEntities: Entity[],
    expectedEntities: string[]
  ): EntityEvaluation {
    const extractedNames = extractedEntities.map(e => e.name.toLowerCase());
    const expectedNames = expectedEntities.map(e => e.toLowerCase());

    // Calculate precision, recall, and F1 score
    const truePositives = extractedNames.filter(name => 
      expectedNames.some(expected => 
        name.includes(expected) || expected.includes(name)
      )
    ).length;

    const precision = extractedNames.length > 0 ? truePositives / extractedNames.length : 0;
    const recall = expectedNames.length > 0 ? truePositives / expectedNames.length : 1;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      queryId,
      originalQuery,
      extractedEntities,
      expectedEntities,
      precision,
      recall,
      f1Score
    };
  }

  private evaluateResponseQuality(
    queryId: string,
    originalQuery: string,
    response: string,
    expectedResponse?: string
  ): ResponseEvaluation {
    // Evaluate completeness (response length and structure)
    const completenessScore = this.calculateCompletenessScore(response);
    
    // Evaluate consistency (coherence and structure)
    const consistencyScore = this.calculateConsistencyScore(response);
    
    // Evaluate relevance (keyword overlap with query)
    const relevanceScore = this.calculateRelevanceScore(originalQuery, response);
    
    // Evaluate factual accuracy (presence of specific information)
    const factualAccuracy = this.calculateFactualAccuracy(response, expectedResponse);

    return {
      queryId,
      originalQuery,
      response,
      completenessScore,
      consistencyScore,
      relevanceScore,
      factualAccuracy
    };
  }

  private calculateCompletenessScore(response: string): number {
    let score = 0;
    
    // Check response length (not too short, not too long)
    const wordCount = response.split(' ').length;
    if (wordCount >= 20 && wordCount <= 200) score += 0.3;
    else if (wordCount >= 10) score += 0.15;
    
    // Check for structured information
    if (response.includes('•') || response.includes('-') || response.includes('\n')) score += 0.2;
    
    // Check for specific data points
    if (/\d+/.test(response)) score += 0.2; // Contains numbers
    if (response.includes('%')) score += 0.1; // Contains percentages
    if (response.includes('confidence') || response.includes('accuracy')) score += 0.1;
    
    // Check for actionable information
    if (response.includes('Would you like') || response.includes('You can')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private calculateConsistencyScore(response: string): number {
    let score = 0;
    
    // Check for consistent formatting
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) score += 0.3;
    
    // Check for logical flow
    if (response.includes('Based on') || response.includes('I found')) score += 0.2;
    if (response.includes('Here') || response.includes('The following')) score += 0.2;
    
    // Check for proper conclusions
    if (response.includes('Would you like') || response.includes('Let me know')) score += 0.2;
    
    // Check for no contradictions (simplified check)
    const words = response.toLowerCase().split(' ');
    const hasContradictions = words.includes('but') && words.includes('however');
    if (!hasContradictions) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private calculateRelevanceScore(query: string, response: string): number {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);
    const responseWords = response.toLowerCase().split(' ');
    
    const relevantWords = queryWords.filter(word => 
      responseWords.some(respWord => respWord.includes(word) || word.includes(respWord))
    );
    
    return queryWords.length > 0 ? relevantWords.length / queryWords.length : 0;
  }

  private calculateFactualAccuracy(response: string, expectedResponse?: string): number {
    if (!expectedResponse) return 0.8; // Default score when no ground truth
    
    const responseWords = response.toLowerCase().split(' ');
    const expectedWords = expectedResponse.toLowerCase().split(' ');
    
    const matchingConcepts = expectedWords.filter(word => 
      responseWords.some(respWord => respWord.includes(word) || word.includes(respWord))
    );
    
    return expectedWords.length > 0 ? matchingConcepts.length / expectedWords.length : 0;
  }

  generateEvaluationReport(
    sessionId: string,
    evaluations: {
      intentEval: IntentEvaluation;
      entityEval: EntityEvaluation;
      responseEval: ResponseEvaluation;
    }[]
  ): EvaluationReport {
    const totalQueries = evaluations.length;
    
    // Calculate aggregate metrics
    const intentAccuracy = evaluations.reduce((sum, e) => 
      sum + (e.intentEval.isCorrect ? 1 : 0), 0) / totalQueries;
    
    const entityAccuracy = evaluations.reduce((sum, e) => 
      sum + e.entityEval.f1Score, 0) / totalQueries;
    
    const responseCompleteness = evaluations.reduce((sum, e) => 
      sum + e.responseEval.completenessScore, 0) / totalQueries;
    
    const responseConsistency = evaluations.reduce((sum, e) => 
      sum + e.responseEval.consistencyScore, 0) / totalQueries;
    
    const overallScore = (intentAccuracy + entityAccuracy + responseCompleteness + responseConsistency) / 4;

    const metrics: EvaluationMetrics = {
      intentRecognitionAccuracy: intentAccuracy,
      entityRecognitionAccuracy: entityAccuracy,
      responseCompleteness,
      responseConsistency,
      overallScore,
      timestamp: new Date()
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, evaluations);

    const report: EvaluationReport = {
      sessionId,
      timestamp: new Date(),
      totalQueries,
      metrics,
      intentEvaluations: evaluations.map(e => e.intentEval),
      entityEvaluations: evaluations.map(e => e.entityEval),
      responseEvaluations: evaluations.map(e => e.responseEval),
      recommendations
    };

    this.evaluationHistory.push(report);
    return report;
  }

  private generateRecommendations(
    metrics: EvaluationMetrics,
    evaluations: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.intentRecognitionAccuracy < 0.8) {
      recommendations.push("Improve intent classification patterns and training data");
    }

    if (metrics.entityRecognitionAccuracy < 0.7) {
      recommendations.push("Enhance entity recognition patterns and domain-specific dictionaries");
    }

    if (metrics.responseCompleteness < 0.7) {
      recommendations.push("Improve response templates and ensure comprehensive information retrieval");
    }

    if (metrics.responseConsistency < 0.8) {
      recommendations.push("Standardize response formatting and logical flow patterns");
    }

    if (metrics.overallScore < 0.75) {
      recommendations.push("Consider retraining models with additional domain-specific data");
    }

    // Add specific recommendations based on common failure patterns
    const lowConfidenceQueries = evaluations.filter(e => e.intentEval.confidence < 0.5);
    if (lowConfidenceQueries.length > evaluations.length * 0.3) {
      recommendations.push("Implement query clarification mechanisms for ambiguous requests");
    }

    return recommendations;
  }

  getPerformanceTrends(days: number = 30): {
    dates: string[];
    intentAccuracy: number[];
    entityAccuracy: number[];
    overallScore: number[];
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentReports = this.evaluationHistory.filter(report => 
      report.timestamp >= cutoffDate
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      dates: recentReports.map(r => r.timestamp.toISOString().split('T')[0]),
      intentAccuracy: recentReports.map(r => r.metrics.intentRecognitionAccuracy),
      entityAccuracy: recentReports.map(r => r.metrics.entityRecognitionAccuracy),
      overallScore: recentReports.map(r => r.metrics.overallScore)
    };
  }

  exportEvaluationData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'SessionId', 'Timestamp', 'TotalQueries', 'IntentAccuracy', 
        'EntityAccuracy', 'ResponseCompleteness', 'ResponseConsistency', 'OverallScore'
      ];
      
      const rows = this.evaluationHistory.map(report => [
        report.sessionId,
        report.timestamp.toISOString(),
        report.totalQueries.toString(),
        report.metrics.intentRecognitionAccuracy.toFixed(3),
        report.metrics.entityRecognitionAccuracy.toFixed(3),
        report.metrics.responseCompleteness.toFixed(3),
        report.metrics.responseConsistency.toFixed(3),
        report.metrics.overallScore.toFixed(3)
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    return JSON.stringify(this.evaluationHistory, null, 2);
  }

  clearEvaluationHistory(): void {
    this.evaluationHistory = [];
  }
}

export default new EvaluationService();