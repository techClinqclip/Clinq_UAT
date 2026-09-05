import os
import re
import time
from dotenv import load_dotenv
from apify_client import ApifyClient
from googleapiclient.discovery import build

load_dotenv()

class SocialInsightsEngine:
    def __init__(self):
        self.apify_token = os.getenv("APIFY_TOKEN")
        self.youtube_key = os.getenv("YOUTUBE_API_KEY")

        if not self.apify_token:
            raise ValueError("Missing APIFY_TOKEN in .env file")
        if not self.youtube_key:
            raise ValueError("Missing YOUTUBE_API_KEY in .env file")

        self.apify_client = ApifyClient(self.apify_token)
        self.youtube = build("youtube", "v3", developerKey=self.youtube_key)

    def extract_youtube_id(self, url: str) -> str:
        """Extracts the 11-character video ID from YouTube Short or Video URLs."""
        pattern = r"(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})"
        match = re.search(pattern, url)
        return match.group(1) if match else None

    def _get_apify_cost(self, run) -> float:
        """Extracts the total cost in USD from an Apify Actor run object."""
        if isinstance(run, dict):
            return float(run.get("usageTotalUsd") or run.get("usage_total_usd") or 0.0)
        
        cost = getattr(run, "usage_total_usd", None) or getattr(run, "usageTotalUsd", None)
        return float(cost) if cost is not None else 0.0

    # --- 1. YOUTUBE BATCH PROCESSOR ---
    def _fetch_youtube_batch(self, urls: list) -> list:
        results = []
        video_ids = [self.extract_youtube_id(url) for url in urls if self.extract_youtube_id(url)]
        
        if not video_ids:
            return results

        start_time = time.time()
        try:
            request = self.youtube.videos().list(
                part="statistics,snippet",
                id=",".join(video_ids)
            )
            response = request.execute()
            duration = round(time.time() - start_time, 2)
            cost_usd = 0.00000

            print(f" [YouTube API] Fetched {len(response.get('items', []))} item(s) | Duration: {duration}s | Cost: ${cost_usd:.5f} USD")

            for item in response.get("items", []):
                stats = item.get("statistics", {})
                results.append({
                    "platform": "YouTube",
                    "url": f"https://www.youtube.com/watch?v={item['id']}",
                    "title": item["snippet"].get("title", ""),
                    "views": int(stats.get("viewCount", 0)),
                    "likes": int(stats.get("likeCount", 0)),
                    "comments": int(stats.get("commentCount", 0)),
                    "per_item_cost_usd": cost_usd,
                    "batch_total_cost_usd": cost_usd,
                    "duration_seconds": duration
                })
        except Exception as e:
            print(f"❌ [YouTube Error] {e}")

        return results

    # --- 2. INSTAGRAM BATCH PROCESSOR ---
    def _fetch_instagram_batch(self, urls: list) -> list:
        if not urls:
            return []

        results = []
        run_input = {
            "directUrls": urls,
            "resultsLimit": len(urls)
        }

        start_time = time.time()
        try:
            print(f" [Apify] Batch scraping {len(urls)} Instagram URL(s)...")
            run = self.apify_client.actor("apify/instagram-scraper").call(run_input=run_input)
            duration = round(time.time() - start_time, 2)
            cost_usd = self._get_apify_cost(run)
            per_item_cost = round(cost_usd / len(urls), 5)

            print(f"   └─ Instagram Batch Complete | Duration: {duration}s | Cost: ${cost_usd:.5f} USD")

            dataset_id = getattr(run, "default_dataset_id", None) or run.get("defaultDatasetId")

            for item in self.apify_client.dataset(dataset_id).iterate_items():
                results.append({
                    "platform": "Instagram",
                    "url": item.get("url"),
                    "views": item.get("videoPlayCount") or item.get("videoViewCount", 0),
                    "likes": item.get("likesCount", 0),
                    "comments": item.get("commentsCount", 0),
                    "per_item_cost_usd": per_item_cost,
                    "batch_total_cost_usd": round(cost_usd, 5),
                    "duration_seconds": duration
                })
        except Exception as e:
            print(f"❌ [Instagram Error] {e}")

        return results

    # --- 3. TWITTER / X BATCH PROCESSOR ---
    def _fetch_twitter_batch(self, urls: list) -> list:
        if not urls:
            return []

        results = []
        run_input = {
            "startUrls": urls,
            "maxItems": len(urls)
        }

        start_time = time.time()
        try:
            print(f" [Apify] Batch scraping {len(urls)} Twitter URL(s)...")
            run = self.apify_client.actor("apify/twitter-scraper").call(run_input=run_input)
            duration = round(time.time() - start_time, 2)
            cost_usd = self._get_apify_cost(run)
            per_item_cost = round(cost_usd / len(urls), 5)

            print(f"   └─ Twitter Batch Complete | Duration: {duration}s | Cost: ${cost_usd:.5f} USD")

            dataset_id = getattr(run, "default_dataset_id", None) or run.get("defaultDatasetId")

            for item in self.apify_client.dataset(dataset_id).iterate_items():
                results.append({
                    "platform": "Twitter/X",
                    "url": item.get("url") or item.get("twitterUrl"),
                    "views": item.get("viewCount") or item.get("retweetCount", 0),
                    "likes": item.get("likeCount", 0),
                    "comments": item.get("replyCount", 0),
                    "per_item_cost_usd": per_item_cost,
                    "batch_total_cost_usd": round(cost_usd, 5),
                    "duration_seconds": duration
                })
        except Exception as e:
            print(f"❌ [Twitter Error] {e}")

        return results

    # --- 4. FACEBOOK BATCH PROCESSOR ---
    def _fetch_facebook_batch(self, urls: list) -> list:
        if not urls:
            return []

        results = []
        # Uses Apify actor designed for direct Facebook post/reel URLs
        run_input = {
            "urls": urls,
            "resultsLimit": len(urls)
        }

        start_time = time.time()
        try:
            print(f" [Apify] Batch scraping {len(urls)} Facebook URL(s)...")
            run = self.apify_client.actor("apify/facebook-posts-scraper").call(run_input=run_input)
            duration = round(time.time() - start_time, 2)
            cost_usd = self._get_apify_cost(run)
            per_item_cost = round(cost_usd / len(urls), 5)

            print(f"   └─ Facebook Batch Complete | Duration: {duration}s | Cost: ${cost_usd:.5f} USD")

            dataset_id = getattr(run, "default_dataset_id", None) or run.get("defaultDatasetId")

            for item in self.apify_client.dataset(dataset_id).iterate_items():
                results.append({
                    "platform": "Facebook",
                    "url": item.get("url") or item.get("postUrl"),
                    "views": item.get("viewsCount") or item.get("videoViewCount") or 0,
                    "likes": item.get("likesCount") or item.get("reactionCount", 0),
                    "comments": item.get("commentsCount", 0),
                    "per_item_cost_usd": per_item_cost,
                    "batch_total_cost_usd": round(cost_usd, 5),
                    "duration_seconds": duration
                })
        except Exception as e:
            print(f"❌ [Facebook Error] {e}")

        return results

    # --- MAIN ROUTER ---
    def get_metrics_report(self, urls: list) -> list:
        yt_urls, ig_urls, tw_urls, fb_urls = [], [], [], []

        for url in urls:
            if "youtube.com" in url or "youtu.be" in url:
                yt_urls.append(url)
            elif "instagram.com" in url:
                ig_urls.append(url)
            elif "twitter.com" in url or "x.com" in url:
                tw_urls.append(url)
            elif "facebook.com" in url or "fb.watch" in url:
                fb_urls.append(url)

        report = []

        if yt_urls:
            report.extend(self._fetch_youtube_batch(yt_urls))
        if ig_urls:
            report.extend(self._fetch_instagram_batch(ig_urls))
        if tw_urls:
            report.extend(self._fetch_twitter_batch(tw_urls))
        if fb_urls:
            report.extend(self._fetch_facebook_batch(fb_urls))

        return report