"""
Shortlink Service - Creates and manages shortlinks using Cloudflare Worker
"""
import json
import logging
import requests
from typing import Dict, Optional, Any
from datetime import datetime
import os
import hashlib
import random
import string

logger = logging.getLogger(__name__)

class ShortlinkService:
    """Service for creating and managing shortlinks"""
    
    def __init__(self, worker_url: str = None, api_key: str = None):
        """
        Initialize ShortlinkService
        
        Args:
            worker_url: Cloudflare Worker URL
            api_key: Optional API key for authentication
        """
        self.worker_url = worker_url or os.getenv('CLOUDFLARE_WORKER_URL', 'https://telegram-bot-worker.workers.dev')
        self.api_key = api_key or os.getenv('CLOUDFLARE_API_KEY')
        self.headers = {
            'Content-Type': 'application/json'
        }
        if self.api_key:
            self.headers['Authorization'] = f'Bearer {self.api_key}'
        
        # Local cache of shortlinks
        self.shortlink_cache = {}
    
    async def create_shortlink(
        self, 
        url: str, 
        custom_code: str = None,
        metadata: Dict = None
    ) -> Optional[Dict[str, str]]:
        """
        Create a new shortlink
        
        Args:
            url: Target URL to shorten
            custom_code: Optional custom short code
            metadata: Optional metadata to attach
            
        Returns:
            Dictionary with shortlink details or None
        """
        try:
            # Validate URL
            if not url.startswith(('http://', 'https://')):
                url = f'https://{url}'
            
            # Generate short code if not provided
            if not custom_code:
                custom_code = self._generate_short_code(url)
            
            # Check cache first
            if custom_code in self.shortlink_cache:
                cached = self.shortlink_cache[custom_code]
                if cached['url'] == url:
                    return cached
            
            # Create via Cloudflare Worker
            if self.worker_url:
                response = requests.post(
                    f"{self.worker_url}/api/shortlink",
                    headers=self.headers,
                    json={
                        'url': url,
                        'customCode': custom_code,
                        'metadata': metadata or {}
                    },
                    timeout=5
                )
                
                if response.ok:
                    data = response.json()
                    if data.get('success'):
                        result = {
                            'short_code': data.get('shortCode'),
                            'short_url': data.get('shortUrl'),
                            'target_url': data.get('targetUrl'),
                            'created_at': datetime.now().isoformat()
                        }
                        
                        # Cache the result
                        self.shortlink_cache[custom_code] = result
                        
                        logger.info(f"Created shortlink: {result['short_url']} -> {url}")
                        return result
            
            # Fallback to local generation
            short_url = f"{self.worker_url}/s/{custom_code}"
            result = {
                'short_code': custom_code,
                'short_url': short_url,
                'target_url': url,
                'created_at': datetime.now().isoformat()
            }
            
            self.shortlink_cache[custom_code] = result
            return result
            
        except Exception as e:
            logger.error(f"Error creating shortlink: {e}")
            return None
    
    async def create_portal_shortlink(self, customer_id: str = None) -> Optional[str]:
        """
        Create a shortlink for the web portal
        
        Args:
            customer_id: Optional customer ID for personalized link
            
        Returns:
            Short URL or None
        """
        try:
            base_url = "http://localhost:5000"
            
            if customer_id:
                target_url = f"{base_url}/customer/{customer_id}"
                custom_code = f"portal_{customer_id.lower()}"
            else:
                target_url = base_url
                custom_code = "portal"
            
            result = await self.create_shortlink(
                target_url,
                custom_code=custom_code,
                metadata={
                    'type': 'portal',
                    'customer_id': customer_id,
                    'created_by': 'bot'
                }
            )
            
            return result['short_url'] if result else None
            
        except Exception as e:
            logger.error(f"Error creating portal shortlink: {e}")
            return None
    
    async def create_telegram_shortlink(
        self, 
        bot_username: str,
        start_param: str = None,
        mini_app_url: str = None
    ) -> Optional[str]:
        """
        Create a shortlink for Telegram deep links
        
        Args:
            bot_username: Bot username (without @)
            start_param: Optional start parameter
            mini_app_url: Optional mini app URL
            
        Returns:
            Short URL or None
        """
        try:
            if mini_app_url:
                # Mini app deep link
                target_url = f"https://t.me/{bot_username}/{mini_app_url.replace('https://', '').replace('/', '')}"
                custom_code = f"app_{self._generate_short_code(mini_app_url, length=4)}"
            elif start_param:
                # Bot deep link with start parameter
                target_url = f"https://t.me/{bot_username}?start={start_param}"
                custom_code = f"start_{start_param[:8]}"
            else:
                # Basic bot link
                target_url = f"https://t.me/{bot_username}"
                custom_code = f"bot_{bot_username}"
            
            result = await self.create_shortlink(
                target_url,
                custom_code=custom_code,
                metadata={
                    'type': 'telegram',
                    'bot_username': bot_username,
                    'start_param': start_param,
                    'mini_app_url': mini_app_url
                }
            )
            
            return result['short_url'] if result else None
            
        except Exception as e:
            logger.error(f"Error creating Telegram shortlink: {e}")
            return None
    
    async def get_shortlink_stats(self, short_code: str) -> Optional[Dict]:
        """
        Get statistics for a shortlink
        
        Args:
            short_code: Short code to look up
            
        Returns:
            Statistics dictionary or None
        """
        try:
            # Check cache first
            if short_code in self.shortlink_cache:
                return self.shortlink_cache[short_code]
            
            # Fetch from worker
            if self.worker_url:
                response = requests.get(
                    f"{self.worker_url}/api/shortlink/{short_code}",
                    headers=self.headers,
                    timeout=5
                )
                
                if response.ok:
                    data = response.json()
                    if data.get('success'):
                        return data.get('data')
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting shortlink stats: {e}")
            return None
    
    def _generate_short_code(self, url: str, length: int = 6) -> str:
        """
        Generate a short code for a URL
        
        Args:
            url: URL to generate code for
            length: Length of the code
            
        Returns:
            Short code string
        """
        # Try to create a memorable code from the URL
        if 'customer' in url.lower():
            prefix = 'cust'
        elif 'admin' in url.lower():
            prefix = 'adm'
        elif 'portal' in url.lower():
            prefix = 'prt'
        elif 'telegram' in url.lower() or 't.me' in url:
            prefix = 'tg'
        else:
            # Use hash for consistency
            hash_obj = hashlib.md5(url.encode())
            hash_hex = hash_obj.hexdigest()[:4]
            prefix = hash_hex
        
        # Add random suffix
        suffix_length = max(2, length - len(prefix))
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=suffix_length))
        
        return f"{prefix}{suffix}"
    
    async def batch_create_shortlinks(self, urls: list) -> Dict[str, Optional[str]]:
        """
        Create multiple shortlinks at once
        
        Args:
            urls: List of URLs to shorten
            
        Returns:
            Dictionary mapping original URLs to short URLs
        """
        results = {}
        
        for url in urls:
            result = await self.create_shortlink(url)
            results[url] = result['short_url'] if result else None
        
        return results

# Global shortlink service instance
shortlink_service = ShortlinkService()