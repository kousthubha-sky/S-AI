// services/newsService.ts

interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  image?: string;
  published_at: string;
  author?: string;
}

interface NewsResponse {
  data: NewsArticle[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
}

interface FormattedNewsResponse {
  message: string;
  data: NewsArticle[];
  sourceType: 'live_news_api';
}

export const NewsService = {
  /**
   * Fetch live news data from mediastack API
   */
  async fetchLiveNews(
    query: string,
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<any>
  ): Promise<FormattedNewsResponse> {
    try {
      let response: any;
      
      try {
        response = await fetchWithAuth(
          `${import.meta.env.VITE_API_BASE_URL}/api/news/search`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              sort: 'published_desc',
              limit: 10,
            }),
          }
        );
      } catch (fetchError) {
        console.error('[NewsService] Fetch request failed:', fetchError);
        throw new Error(
          fetchError instanceof Error 
            ? `Network error: ${fetchError.message}` 
            : 'Network error: Failed to reach news service'
        );
      }

      // Check if response exists
      if (!response) {
        throw new Error('No response received from news service');
      }

      // Check if response indicates an error (status or error field)
      if (response.status && !response.ok) {
        let errorMessage = `HTTP ${response.status || 'unknown'}`;
        if (response.statusText) {
          errorMessage = `${response.statusText} (${response.status})`;
        }
        
        try {
          const errorData = typeof response.json === 'function' ? await response.json() : response;

          // Try to extract meaningful error message from response
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
          }
        } catch (parseErr) {
          console.warn('[NewsService] Could not parse error response');
        }
        
        console.error('[NewsService] API Error:', { status: response.status, statusText: response.statusText, errorMessage });
        throw new Error(`News API error: ${errorMessage}`);
      }

      // fetchWithAuth already returns parsed JSON from backend
      // The backend returns: { data: [...articles...], pagination: {...} }
      const newsData: NewsResponse = response;

      // Check if we got articles
      if (!newsData.data || newsData.data.length === 0) {
        console.warn('[NewsService] No articles in response:', { response });
        return {
          message: `No news articles found for "${query}". Try searching for different keywords or broader topics.`,
          data: [],
          sourceType: 'live_news_api',
        };
      }

      // Format the response similar to AI assistant response
      const formattedArticles = newsData.data
        .map((article) => {
          let formattedText = `**${article.title}**\n`;
          if (article.description) {
            formattedText += `${article.description}\n`;
          }
          formattedText += `\n*Source: ${article.source}*`;
          if (article.published_at) {
            formattedText += ` | *Published: ${new Date(article.published_at).toLocaleDateString()}*`;
          }
          if (article.url) {
            // Use a special format for the link that opens in new tab
            formattedText += `\n[🔗 Read Full Article](${article.url})`;
          }
          return formattedText;
        })
        .join('\n\n---\n\n');

      const message = `## 📰 Live News Results for "${query}"\n\n${formattedArticles}`;

      return {
        message,
        data: newsData.data,
        sourceType: 'live_news_api',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NewsService] Fetch error:', errorMessage);
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
        throw new Error('Unable to connect to news service. Please check your internet connection and try again.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        throw new Error('Access denied. You may not have permission to search for news.');
      } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        throw new Error('News service is temporarily unavailable. Please try again later.');
      } else if (errorMessage.includes('Mediastack')) {
        // Mediastack-specific errors (API key issues, etc.)
        throw new Error(`News API configuration error: ${errorMessage.replace('Mediastack error', '').trim()}`);
      } else {
        throw new Error(`Failed to fetch news: ${errorMessage}`);
      }
    }
  },

  /**
   * Format news data into a message similar to AI response
   */
  formatNewsAsMessage(articles: NewsArticle[], query: string): string {
    if (articles.length === 0) {
      return `No news found for "${query}".`;
    }

    const formattedArticles = articles
      .map((article) => {
        let text = `**${article.title}**\n`;
        if (article.description) {
          text += `${article.description}\n`;
        }
        text += `\n_Source: ${article.source}_`;
        if (article.published_at) {
          text += ` | _Published: ${new Date(article.published_at).toLocaleDateString()}_`;
        }
        if (article.url) {
          text += `\n[Read More](${article.url})`;
        }
        return text;
      })
      .join('\n\n---\n\n');

    return `## 📰 Live News Results for "${query}"\n\n${formattedArticles}`;
  },
};