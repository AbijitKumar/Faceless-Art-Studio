"""
Supabase Storage and Media Assets management for Faceless Art Studio.
Provides persistent cloud storage for user source videos and media metadata.
"""

import logging
import mimetypes
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.parse
import urllib.request
import aiohttp

logger = logging.getLogger("faceless_studio.storage")

BASE_DIR = Path(__file__).resolve().parent.parent.parent

def _load_env():
    for candidate in [BASE_DIR / ".env", BASE_DIR / "frontend" / ".env"]:
        if candidate.exists() and candidate.is_file():
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass

_load_env()

SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_ANON_KEY = (
    os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
    or ""
).strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "source-videos").strip()


def is_supabase_configured() -> bool:
    """Check if Supabase is properly configured with valid URL and key."""
    return bool(
        SUPABASE_URL
        and SUPABASE_URL.startswith("https://")
        and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)
    )


def get_auth_headers(user_token: Optional[str] = None) -> Dict[str, str]:
    """
    Construct authentication headers for Supabase API requests.
    Prioritizes SUPABASE_SERVICE_ROLE_KEY for server operations, or uses user Bearer token with ANON_KEY.
    """
    if SUPABASE_SERVICE_ROLE_KEY:
        return {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        }
    
    token = user_token or SUPABASE_ANON_KEY
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    }


async def upload_to_supabase_storage(
    file_bytes: bytes,
    storage_path: str,
    mime_type: Optional[str] = None,
    user_token: Optional[str] = None,
    bucket: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Upload file bytes to private Supabase Storage bucket.
    """
    if not is_supabase_configured():
        raise RuntimeError("Supabase credentials are not configured on the server.")

    target_bucket = bucket or SUPABASE_STORAGE_BUCKET
    encoded_path = urllib.parse.quote(storage_path.lstrip("/"), safe="/")
    url = f"{SUPABASE_URL}/storage/v1/object/{target_bucket}/{encoded_path}"

    detected_mime = mime_type or mimetypes.guess_type(storage_path)[0] or "video/mp4"
    headers = get_auth_headers(user_token)
    headers["Content-Type"] = detected_mime
    headers["x-upsert"] = "true"

    timeout = aiohttp.ClientTimeout(total=300)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, data=file_bytes, headers=headers) as resp:
            body = await resp.text()
            if resp.status not in (200, 201):
                logger.error(f"Supabase Storage upload failed ({resp.status}): {body}")
                raise RuntimeError(f"Storage upload failed ({resp.status}): {body}")
            try:
                import json
                return json.loads(body)
            except Exception:
                return {"path": storage_path, "bucket": target_bucket}


async def create_signed_storage_url(
    storage_path: str,
    expires_in_seconds: int = 3600,
    user_token: Optional[str] = None,
    bucket: Optional[str] = None,
) -> str:
    """
    Generate a short-lived signed URL for downloading/viewing a private storage object.
    """
    if not is_supabase_configured():
        raise RuntimeError("Supabase is not configured.")

    target_bucket = bucket or SUPABASE_STORAGE_BUCKET
    encoded_path = urllib.parse.quote(storage_path.lstrip("/"), safe="/")
    url = f"{SUPABASE_URL}/storage/v1/object/sign/{target_bucket}/{encoded_path}"

    headers = get_auth_headers(user_token)
    headers["Content-Type"] = "application/json"
    payload = {"expiresIn": expires_in_seconds}

    timeout = aiohttp.ClientTimeout(total=10)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, json=payload, headers=headers) as resp:
            if resp.status not in (200, 201):
                err = await resp.text()
                logger.error(f"Failed to sign URL for {storage_path} ({resp.status}): {err}")
                raise RuntimeError(f"Failed to create signed URL: {err}")
            data = await resp.json()
            signed_url_path = data.get("signedURL") or data.get("signedUrl") or ""
            if signed_url_path.startswith("http"):
                return signed_url_path
            return f"{SUPABASE_URL}{signed_url_path}"


async def insert_media_asset_metadata(
    record: Dict[str, Any],
    user_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Insert a record into the public.media_assets table via Supabase PostgREST.
    """
    if not is_supabase_configured():
        raise RuntimeError("Supabase is not configured.")

    url = f"{SUPABASE_URL}/rest/v1/media_assets"
    headers = get_auth_headers(user_token)
    headers["Content-Type"] = "application/json"
    headers["Prefer"] = "return=representation"

    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, json=[record], headers=headers) as resp:
            body = await resp.text()
            if resp.status not in (200, 201):
                logger.error(f"Failed to insert media_asset record ({resp.status}): {body}")
                raise RuntimeError(f"Database insert failed ({resp.status}): {body}")
            import json
            data = json.loads(body)
            return data[0] if isinstance(data, list) and data else record


async def query_user_media_assets(
    user_id: str,
    category: str = "input",
    user_token: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch all media assets for an authenticated user filtered by category.
    """
    if not is_supabase_configured():
        return []

    url = (
        f"{SUPABASE_URL}/rest/v1/media_assets"
        f"?user_id=eq.{user_id}&category=eq.{category}&order=created_at.desc"
    )
    headers = get_auth_headers(user_token)

    timeout = aiohttp.ClientTimeout(total=15)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                body = await resp.text()
                logger.warning(f"Failed to query media_assets ({resp.status}): {body}")
                return []
    except Exception as exc:
        logger.error(f"Error querying media_assets: {exc}")
        return []


async def delete_media_asset_record_and_file(
    asset_id: str,
    user_id: str,
    storage_path: str,
    user_token: Optional[str] = None,
    bucket: Optional[str] = None,
) -> bool:
    """
    Deletes both the Supabase Storage object and the database record.
    """
    if not is_supabase_configured():
        return False

    target_bucket = bucket or SUPABASE_STORAGE_BUCKET

    # 1. Delete from Supabase Storage
    try:
        del_url = f"{SUPABASE_URL}/storage/v1/object/{target_bucket}"
        headers = get_auth_headers(user_token)
        headers["Content-Type"] = "application/json"
        payload = {"prefixes": [storage_path]}

        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.delete(del_url, json=payload, headers=headers) as resp:
                if resp.status not in (200, 204):
                    err_txt = await resp.text()
                    logger.warning(f"Storage delete warning for {storage_path} ({resp.status}): {err_txt}")
    except Exception as exc:
        logger.error(f"Error deleting storage object {storage_path}: {exc}")

    # 2. Delete database record
    try:
        db_url = f"{SUPABASE_URL}/rest/v1/media_assets?id=eq.{asset_id}&user_id=eq.{user_id}"
        headers = get_auth_headers(user_token)
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.delete(db_url, headers=headers) as resp:
                if resp.status in (200, 204):
                    return True
                err = await resp.text()
                logger.error(f"Failed to delete media_asset record ({resp.status}): {err}")
                return False
    except Exception as exc:
        logger.error(f"Error deleting media_asset record: {exc}")
        return False


def download_storage_file_sync(
    storage_path: str,
    local_dest: Path,
    user_token: Optional[str] = None,
    bucket: Optional[str] = None,
) -> Path:
    """
    Synchronously download a file from Supabase Storage into a local temporary destination.
    Used by video generation worker threads.
    """
    if not is_supabase_configured():
        raise RuntimeError("Supabase is not configured.")

    target_bucket = bucket or SUPABASE_STORAGE_BUCKET
    encoded_path = urllib.parse.quote(storage_path.lstrip("/"), safe="/")
    url = f"{SUPABASE_URL}/storage/v1/object/{target_bucket}/{encoded_path}"

    headers = get_auth_headers(user_token)
    req = urllib.request.Request(url, headers=headers, method="GET")

    local_dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req, timeout=180) as resp, open(local_dest, "wb") as out_f:
        chunk_size = 1024 * 1024  # 1MB
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out_f.write(chunk)

    if not local_dest.exists() or local_dest.stat().st_size == 0:
        raise RuntimeError(f"Downloaded file from {storage_path} is empty or missing.")

    logger.info(f"Successfully downloaded {storage_path} to {local_dest} ({local_dest.stat().st_size} bytes)")
    return local_dest
