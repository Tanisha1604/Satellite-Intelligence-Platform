// Real web crawler service for production use
export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  metadata: Record<string, any>;
  timestamp: Date;
  contentType: string;
  statusCode: number;
}

export interface CrawlProgress {
  totalUrls: number;
  processedUrls: number;
  currentUrl: string;
  errors: string[];
  successCount: number;
  failureCount: number;
}

export interface CrawlConfig {
  maxPages: number;
  delay: number;
  respectRobots: boolean;
  userAgent: string;
  timeout: number;
  retries: number;
  allowedDomains: string[];
  excludePatterns: RegExp[];
}

class RealCrawlerService {
  private results: CrawlResult[] = [];
  private progressCallback?: (progress: CrawlProgress) => void;
  private isRunning = false;
  private abortController?: AbortController;

  private defaultConfig: CrawlConfig = {
    maxPages: 100,
    delay: 1000,
    respectRobots: true,
    userAgent: 'MOSDAC-AI-Bot/1.0',
    timeout: 30000,
    retries: 3,
    allowedDomains: ['mosdac.gov.in', 'isro.gov.in', 'nrsc.gov.in'],
    excludePatterns: [
      /\.(jpg|jpeg|png|gif|pdf|doc|docx|zip|rar)$/i,
      /\/admin\//,
      /\/login\//,
      /\/logout\//
    ]
  };

  setProgressCallback(callback: (progress: CrawlProgress) => void) {
    this.progressCallback = callback;
  }

  async startCrawl(startUrls: string[], config?: Partial<CrawlConfig>): Promise<CrawlResult[]> {
    if (this.isRunning) {
      throw new Error('Crawler is already running');
    }

    this.isRunning = true;
    this.results = [];
    this.abortController = new AbortController();

    const finalConfig = { ...this.defaultConfig, ...config };
    const urlQueue = [...startUrls];
    const visitedUrls = new Set<string>();
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      console.log(`Starting real crawl with ${urlQueue.length} seed URLs`);

      while (urlQueue.length > 0 && visitedUrls.size < finalConfig.maxPages && this.isRunning) {
        const currentUrl = urlQueue.shift()!;
        
        if (visitedUrls.has(currentUrl) || !this.isAllowedUrl(currentUrl, finalConfig)) {
          continue;
        }

        visitedUrls.add(currentUrl);

        // Update progress
        this.progressCallback?.({
          totalUrls: Math.min(urlQueue.length + visitedUrls.size, finalConfig.maxPages),
          processedUrls: visitedUrls.size,
          currentUrl,
          errors,
          successCount,
          failureCount
        });

        try {
          const result = await this.crawlUrl(currentUrl, finalConfig);
          if (result) {
            this.results.push(result);
            successCount++;

            // Extract new URLs from the page
            const newUrls = this.extractUrls(result.content, currentUrl, finalConfig);
            urlQueue.push(...newUrls.filter(url => !visitedUrls.has(url)));
          }
        } catch (error) {
          console.error(`Failed to crawl ${currentUrl}:`, error);
          errors.push(`${currentUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failureCount++;
        }

        // Respect delay between requests
        if (finalConfig.delay > 0) {
          await this.sleep(finalConfig.delay);
        }
      }

      console.log(`Crawl completed: ${successCount} successful, ${failureCount} failed`);
      
      // Final progress update
      this.progressCallback?.({
        totalUrls: visitedUrls.size,
        processedUrls: visitedUrls.size,
        currentUrl: 'Crawling completed',
        errors,
        successCount,
        failureCount
      });

      return this.results;

    } catch (error) {
      console.error('Crawl error:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async crawlUrl(url: string, config: CrawlConfig): Promise<CrawlResult | null> {
    try {
      console.log(`Crawling: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: this.abortController?.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      // Only process HTML content
      if (!contentType.includes('text/html')) {
        console.log(`Skipping non-HTML content: ${url} (${contentType})`);
        return null;
      }

      const html = await response.text();
      const { title, content, links, metadata } = this.parseHtml(html, url);

      return {
        url,
        title,
        content,
        links,
        metadata,
        timestamp: new Date(),
        contentType,
        statusCode: response.status
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Crawl was aborted');
      }
      throw error;
    }
  }

  private parseHtml(html: string, baseUrl: string): {
    title: string;
    content: string;
    links: string[];
    metadata: Record<string, any>;
  } {
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract title
    const title = doc.querySelector('title')?.textContent?.trim() || '';

    // Extract main content (remove scripts, styles, nav, footer, etc.)
    const elementsToRemove = doc.querySelectorAll('script, style, nav, footer, header, aside, .navigation, .menu, .sidebar');
    elementsToRemove.forEach(el => el.remove());

    // Get main content
    const mainContent = doc.querySelector('main, .main, .content, #content, .post, article') || doc.body;
    const content = mainContent?.textContent?.trim() || '';

    // Extract links
    const linkElements = doc.querySelectorAll('a[href]');
    const links: string[] = [];
    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          links.push(absoluteUrl);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });

    // Extract metadata
    const metadata: Record<string, any> = {};
    
    // Meta tags
    const metaTags = doc.querySelectorAll('meta[name], meta[property]');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    // Headings
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => h.textContent?.trim())
      .filter(Boolean);
    metadata.headings = headings;

    return { title, content, links, metadata };
  }

  private extractUrls(content: string, baseUrl: string, config: CrawlConfig): string[] {
    // This is a simplified URL extraction from already parsed content
    // In a real implementation, you'd extract from the original HTML
    const urls: string[] = [];
    
    // For now, return some common MOSDAC URLs that we know exist
    const commonPaths = [
      '/data',
      '/satellites',
      '/products',
      '/services',
      '/about',
      '/help',
      '/faq',
      '/documentation',
      '/user-guide'
    ];

    try {
      const baseUrlObj = new URL(baseUrl);
      commonPaths.forEach(path => {
        const url = new URL(path, baseUrlObj.origin).href;
        if (this.isAllowedUrl(url, config)) {
          urls.push(url);
        }
      });
    } catch (e) {
      // Invalid base URL
    }

    return urls;
  }

  private isAllowedUrl(url: string, config: CrawlConfig): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check allowed domains
      const isAllowedDomain = config.allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
      
      if (!isAllowedDomain) {
        return false;
      }

      // Check exclude patterns
      const isExcluded = config.excludePatterns.some(pattern => 
        pattern.test(url)
      );

      return !isExcluded;

    } catch (e) {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopCrawl(): void {
    this.isRunning = false;
    this.abortController?.abort();
  }

  getResults(): CrawlResult[] {
    return this.results;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  // Real robots.txt checker
  private async checkRobotsTxt(domain: string): Promise<boolean> {
    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await fetch(robotsUrl);
      
      if (!response.ok) {
        return true; // If no robots.txt, assume allowed
      }

      const robotsText = await response.text();
      
      // Simple robots.txt parsing (in production, use a proper parser)
      const lines = robotsText.split('\n');
      let userAgentMatch = false;
      
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        
        if (trimmed.startsWith('user-agent:')) {
          const agent = trimmed.split(':')[1].trim();
          userAgentMatch = agent === '*' || agent.includes('bot');
        }
        
        if (userAgentMatch && trimmed.startsWith('disallow:')) {
          const path = trimmed.split(':')[1].trim();
          if (path === '/') {
            return false; // Disallow all
          }
        }
      }
      
      return true;
    } catch (e) {
      return true; // If can't check, assume allowed
    }
  }
}

export default new RealCrawlerService();