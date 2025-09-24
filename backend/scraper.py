import instaloader
import os
import re
from dotenv import load_dotenv

# Load credentials from .env file
load_dotenv()
INSTA_USERNAME = os.getenv("INSTA_USERNAME")
INSTA_PASSWORD = os.getenv("INSTA_PASSWORD")

# Create a single, reusable Instaloader instance
L = instaloader.Instaloader()
try:
    print("Attempting to log in to Instagram...")
    L.load_session_from_file(INSTA_USERNAME)
except FileNotFoundError:
    L.login(INSTA_USERNAME, INSTA_PASSWORD)
    L.save_session_to_file(INSTA_USERNAME)
print("Instagram login successful.")

def get_shortcode_from_url(post_url: str):
    """Extracts the post's shortcode from its URL."""
    match = re.search(r"/(p|reel)/([^/]+)", post_url)
    if match:
        return match.group(2)
    return None

def fetch_post_data(post_url: str):
    """
    A robust function to fetch caption and image URL from a single post.
    """
    shortcode = get_shortcode_from_url(post_url)
    if not shortcode:
        raise ValueError("Invalid Instagram post URL provided.")

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        caption = post.caption if post.caption else "No caption found."
        media_url = post.url

        return {"caption": caption, "media_urls": [media_url]}
    except Exception as e:
        raise RuntimeError(f"Failed to fetch post {shortcode}: {e}")