import { Entity, Relationship } from './nlpService';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  size: number;
  color: string;
  confidence: number;
  attributes: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  confidence: number;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  clusters: number;
  centralNodes: GraphNode[];
}

class GraphService {
  private typeColors: Record<string, string> = {
    satellite: '#3B82F6',    // Blue
    sensor: '#10B981',       // Green
    data_product: '#8B5CF6', // Purple
    location: '#F59E0B',     // Orange
    organization: '#EF4444', // Red
    mission: '#06B6D4'       // Cyan
  };

  buildGraph(entities: Entity[], relationships: Relationship[]): GraphData {
    const nodes = this.buildNodes(entities);
    const edges = this.buildEdges(relationships, entities);

    return { nodes, edges };
  }

  private buildNodes(entities: Entity[]): GraphNode[] {
    return entities.map(entity => ({
      id: entity.id,
      label: entity.name,
      type: entity.type,
      size: this.calculateNodeSize(entity),
      color: this.typeColors[entity.type] || '#6B7280',
      confidence: entity.confidence,
      attributes: entity.attributes
    }));
  }

  private buildEdges(relationships: Relationship[], entities: Entity[]): GraphEdge[] {
    return relationships.map(rel => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      label: rel.type.replace('_', ' '),
      type: rel.type,
      confidence: rel.confidence,
      weight: this.calculateEdgeWeight(rel)
    }));
  }

  private calculateNodeSize(entity: Entity): number {
    // Base size on confidence and number of mentions
    const baseSize = 10;
    const confidenceBonus = entity.confidence * 20;
    const mentionBonus = Math.min(entity.mentions.length * 2, 20);
    
    return baseSize + confidenceBonus + mentionBonus;
  }

  private calculateEdgeWeight(relationship: Relationship): number {
    // Base weight on confidence and evidence count
    return relationship.confidence * relationship.evidence.length;
  }

  calculateMetrics(graphData: GraphData): GraphMetrics {
    const { nodes, edges } = graphData;
    
    // Calculate basic metrics
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    
    // Calculate degree for each node
    const degrees = new Map<string, number>();
    nodes.forEach(node => degrees.set(node.id, 0));
    
    edges.forEach(edge => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });
    
    const avgDegree = Array.from(degrees.values()).reduce((sum, deg) => sum + deg, 0) / nodeCount || 0;
    
    // Find central nodes (highest degree)
    const centralNodes = nodes
      .map(node => ({ ...node, degree: degrees.get(node.id) || 0 }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 5);
    
    // Estimate clusters (simplified - nodes with similar types)
    const typeGroups = nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const clusters = Object.keys(typeGroups).length;

    return {
      nodeCount,
      edgeCount,
      density,
      avgDegree,
      clusters,
      centralNodes
    };
  }

  searchNodes(graphData: GraphData, query: string): GraphNode[] {
    const lowerQuery = query.toLowerCase();
    return graphData.nodes.filter(node => 
      node.label.toLowerCase().includes(lowerQuery) ||
      node.type.toLowerCase().includes(lowerQuery)
    );
  }

  getConnectedNodes(graphData: GraphData, nodeId: string): GraphNode[] {
    const connectedIds = new Set<string>();
    
    graphData.edges.forEach(edge => {
      if (edge.source === nodeId) {
        connectedIds.add(edge.target);
      } else if (edge.target === nodeId) {
        connectedIds.add(edge.source);
      }
    });

    return graphData.nodes.filter(node => connectedIds.has(node.id));
  }

  filterByType(graphData: GraphData, types: string[]): GraphData {
    const filteredNodes = graphData.nodes.filter(node => types.includes(node.type));
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    const filteredEdges = graphData.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }

  exportGraph(graphData: GraphData, format: 'json' | 'csv' | 'gexf' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(graphData, null, 2);
      
      case 'csv':
        return this.exportToCSV(graphData);
      
      case 'gexf':
        return this.exportToGEXF(graphData);
      
      default:
        return JSON.stringify(graphData, null, 2);
    }
  }

  private exportToCSV(graphData: GraphData): string {
    const nodesCsv = [
      'id,label,type,confidence,size',
      ...graphData.nodes.map(node => 
        `"${node.id}","${node.label}","${node.type}",${node.confidence},${node.size}`
      )
    ].join('\n');

    const edgesCsv = [
      'source,target,type,confidence,weight',
      ...graphData.edges.map(edge => 
        `"${edge.source}","${edge.target}","${edge.type}",${edge.confidence},${edge.weight}`
      )
    ].join('\n');

    return `NODES:\n${nodesCsv}\n\nEDGES:\n${edgesCsv}`;
  }

  private exportToGEXF(graphData: GraphData): string {
    // Simplified GEXF export
    const nodes = graphData.nodes.map(node => 
      `    <node id="${node.id}" label="${node.label}">
      <attvalues>
        <attvalue for="type" value="${node.type}"/>
        <attvalue for="confidence" value="${node.confidence}"/>
      </attvalues>
    </node>`
    ).join('\n');

    const edges = graphData.edges.map((edge, index) => 
      `    <edge id="${index}" source="${edge.source}" target="${edge.target}" label="${edge.label}" weight="${edge.weight}"/>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <graph mode="static" defaultedgetype="undirected">
    <attributes class="node">
      <attribute id="type" title="Type" type="string"/>
      <attribute id="confidence" title="Confidence" type="float"/>
    </attributes>
    <nodes>
${nodes}
    </nodes>
    <edges>
${edges}
    </edges>
  </graph>
</gexf>`;
  }
}

export default new GraphService();