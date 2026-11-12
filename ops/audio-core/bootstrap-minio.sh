#!/bin/sh
set -eu
: "${MINIO_ROOT_USER:?Set MINIO_ROOT_USER}"
: "${MINIO_ROOT_PASSWORD:?Set MINIO_ROOT_PASSWORD}"
: "${S3_ACCESS_KEY:?Set S3_ACCESS_KEY}"
: "${S3_SECRET_KEY:?Set S3_SECRET_KEY}"
S3_BUCKET="${S3_BUCKET:-tamv-audio}"

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb --ignore-existing "local/$S3_BUCKET"
sed "s/tamv-audio/$S3_BUCKET/g" /policy.json > /tmp/policy.json
if ! mc admin policy info local tamv-audio-worker >/dev/null 2>&1; then
  mc admin policy create local tamv-audio-worker /tmp/policy.json
fi
if ! mc admin user info local "$S3_ACCESS_KEY" >/dev/null 2>&1; then
  mc admin user add local "$S3_ACCESS_KEY" "$S3_SECRET_KEY"
fi
mc admin policy attach local tamv-audio-worker --user "$S3_ACCESS_KEY"
echo "Private bucket and least-privilege worker policy provisioned."
