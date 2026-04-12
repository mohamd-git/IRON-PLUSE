"""
Storage service — Cloudflare R2 / S3-compatible file upload, delete, presigned URL.
R2 is S3-compatible so boto3 works with an endpoint_url override.
"""

import logging
import uuid

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger("ironpulse.storage")

_s3_client = None


def _get_s3():
    global _s3_client
    if _s3_client is None:
        kwargs = dict(
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        if settings.AWS_S3_ENDPOINT:
            kwargs["endpoint_url"] = settings.AWS_S3_ENDPOINT
        _s3_client = boto3.client("s3", **kwargs)
    return _s3_client


def _public_url(key: str) -> str:
    """Return the public URL for an uploaded object."""
    if settings.R2_PUBLIC_BUCKET_URL:
        # e.g. https://pub-xxx.r2.dev/key
        base = settings.R2_PUBLIC_BUCKET_URL.rstrip("/")
        return f"{base}/{key}"
    if settings.AWS_S3_ENDPOINT:
        # Fallback: endpoint/bucket/key (works once bucket is public)
        base = settings.AWS_S3_ENDPOINT.rstrip("/")
        return f"{base}/{settings.AWS_S3_BUCKET}/{key}"
    # Standard AWS S3
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


async def upload_file(
    file_bytes: bytes,
    filename: str,
    content_type: str = "image/jpeg",
    folder: str = "uploads",
) -> str:
    """
    Upload raw bytes to R2/S3.
    Returns the public URL of the uploaded object.
    """
    s3 = _get_s3()
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    key = f"{folder.rstrip('/')}/{uuid.uuid4().hex}.{ext}"

    try:
        s3.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except ClientError as e:
        logger.error("R2/S3 upload failed: %s", e)
        raise

    return _public_url(key)


async def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate a pre-signed URL for private objects."""
    s3 = _get_s3()
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_S3_BUCKET, "Key": key},
            ExpiresIn=expires_in,
        )
        return url
    except ClientError as e:
        logger.error("Presigned URL generation failed: %s", e)
        raise


async def delete_file(key: str) -> None:
    """Delete an object from R2/S3."""
    s3 = _get_s3()
    try:
        s3.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
    except ClientError as e:
        logger.error("R2/S3 delete failed: %s", e)
        raise
