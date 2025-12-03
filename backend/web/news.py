# web/news.py - News API integration with mediastack
from fastapi import APIRouter, Depends, HTTPException, status
from auth.dependencies import verify_token
import httpx
import os
from typing import Optional
from utils.validators import InputValidator

router = APIRouter()

# Mediastack API configuration
MEDIASTACK_API_KEY = os.getenv("MEDIASTACK_API_KEY")
MEDIASTACK_BASE_URL = "https://api.mediastack.com/v1/news"

class NewsError(Exception):
    """Custom exception for news API errors"""
    pass

async def fetch_from_mediastack(query: str, limit: int = 10, sort: str = "published_desc") -> dict:
    """
    Fetch news from mediastack API
    
    Args:
        query: Search query for news
        limit: Maximum number of articles to return
        sort: Sort order for results
        
    Returns:
        dict: News articles and metadata
    """
    if not MEDIASTACK_API_KEY:
        raise NewsError("Mediastack API key not configured. Please set MEDIASTACK_API_KEY environment variable.")
    
    params = {
        "access_key": MEDIASTACK_API_KEY,
        "keywords": query,
        "limit": min(limit, 100),
        "sort": sort,
        # Removed country/language filters to get global results
        # "countries": "us,gb,ca",
        # "languages": "en",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Log the request
            print(f"[News API] Making request to: {MEDIASTACK_BASE_URL}")
            print(f"[News API] Request params: access_key=*****, keywords={params.get('keywords')}, limit={params.get('limit')}")
            
            response = await client.get(MEDIASTACK_BASE_URL, params=params)
            
            print(f"[News API] Response status: {response.status_code}")
            print(f"[News API] Response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            
            data = response.json()
            
            print(f"[News API] Response data keys: {list(data.keys())}")
            print(f"[News API] Pagination info: {data.get('pagination', {})}")
            
            if data.get("error"):
                error_obj = data['error']
                if isinstance(error_obj, dict):
                    error_msg = error_obj.get('message', str(error_obj))
                    error_code = error_obj.get('code', 'unknown')
                    raise NewsError(f"Mediastack error ({error_code}): {error_msg}")
                else:
                    raise NewsError(f"Mediastack API error: {str(error_obj)}")
            
            print(f"[News API] Successfully retrieved {len(data.get('data', []))} articles")
            return data
    except httpx.HTTPStatusError as e:
        error_body = e.response.text
        print(f"[News API] HTTP Error {e.status_code}: {error_body}")
        raise NewsError(f"HTTP {e.status_code} from mediastack: {error_body}")
    except httpx.RequestError as e:
        print(f"[News API] Request error: {str(e)}")
        raise NewsError(f"Request failed: {str(e)}")
    except NewsError:
        raise
    except Exception as e:
        print(f"[News API] Unexpected error: {str(e)}")
        raise NewsError(f"Unexpected error: {str(e)}")

@router.post("/api/news/search")
async def search_news(
    search_data: dict,
    payload: dict = Depends(verify_token)
):
    """
    Search for live news articles
    
    Query Parameters:
        - query: Search query (required)
        - sort: Sort order (default: published_desc)
        - limit: Number of articles (default: 10, max: 100)
    """
    try:
        query = search_data.get("query", "").strip()
        if not query:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query is required"
            )

        # Sanitize the search query
        query = InputValidator.sanitize_string(query, max_length=200)

        if len(query) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query must be at least 2 characters"
            )
        
        limit = min(search_data.get("limit", 10), 100)
        sort = search_data.get("sort", "published_desc")
        
        # Validate sort parameter - mediastack supports: published_asc, published_desc, popularity
        valid_sorts = ["published_asc", "published_desc", "popularity"]
        if sort not in valid_sorts:
            print(f"[News API] Invalid sort parameter '{sort}', using default 'published_desc'")
            sort = "published_desc"
        
        print(f"[News API] Searching for: {query} (limit: {limit}, sort: {sort})")
        
        # Fetch news from mediastack
        news_data = await fetch_from_mediastack(query, limit, sort)
        
        print(f"[News API] Raw mediastack response keys: {list(news_data.keys())}")
        print(f"[News API] Raw mediastack data field: {type(news_data.get('data'))}")
        print(f"[News API] Found {len(news_data.get('data', []))} articles")
        
        # Transform response to expected format
        articles = []
        for article in news_data.get("data", []):
            articles.append({
                "title": article.get("title", ""),
                "description": article.get("description", ""),
                "source": article.get("source", ""),
                "url": article.get("url", ""),
                "image": article.get("image"),
                "published_at": article.get("published_at", ""),
                "author": article.get("author"),
            })
        
        print(f"[News API] Transformed to {len(articles)} articles")
        print(f"[News API] Returning response: {{'data': [...{len(articles)} articles...], 'pagination': ...}}")
        
        response_obj = {
            "data": articles,
            "pagination": {
                "limit": limit,
                "offset": 0,
                "count": len(articles),
                "total": news_data.get("pagination", {}).get("total", len(articles)),
            }
        }
        
        print(f"[News API] Final response data count: {len(response_obj['data'])}")
        return response_obj
        
    except NewsError as e:
        print(f"[News API] NewsError: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[News API] Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/api/news/health")
async def health_check():
    """Health check for news API integration"""
    return {
        "status": "ok",
        "service": "news_api",
        "mediastack_configured": bool(MEDIASTACK_API_KEY)
    }
