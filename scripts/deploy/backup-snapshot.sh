#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Copy the CMS files to a timestamped backup before a deployment changes anything.
#
# Usage: backup-snapshot.sh <state_bucket> <cms_bucket> <git_sha>
#   state_bucket  the environment's Terraform state bucket (versioned, private)
#   cms_bucket    the default Storage bucket holding cms/ and cms-backups/
#
# Writes to gs://<state_bucket>/backups/<UTC timestamp>-<sha7>/storage/. It only reads from
# the CMS bucket and only adds objects to the state bucket; nothing is modified or deleted.
# Prints the backup location as the last line ("backup=<gs:// uri>") when one was made.
# Firestore is protected separately (point-in-time recovery, see docs/DEPLOYMENT.md).
# ==============================================================================

STATE_BUCKET="${1:?Usage: backup-snapshot.sh <state_bucket> <cms_bucket> <git_sha>}"
CMS_BUCKET="${2:?Usage: backup-snapshot.sh <state_bucket> <cms_bucket> <git_sha>}"
GIT_SHA="${3:?Usage: backup-snapshot.sh <state_bucket> <cms_bucket> <git_sha>}"

if ! gcloud storage buckets describe "gs://${CMS_BUCKET}" &>/dev/null; then
  echo "::notice::CMS bucket gs://${CMS_BUCKET} does not exist yet; nothing to back up."
  exit 0
fi

DEST="gs://${STATE_BUCKET}/backups/$(date -u +%Y%m%dT%H%M%SZ)-${GIT_SHA:0:7}/storage"
copied=0
for prefix in cms cms-backups; do
  if [[ -n "$(gcloud storage ls "gs://${CMS_BUCKET}/${prefix}/" 2>/dev/null | head -n 1)" ]]; then
    echo "==> Backing up gs://${CMS_BUCKET}/${prefix}/ to ${DEST}/${prefix}/"
    # Explicit destination, so the copy lands in ${DEST}/${prefix}/ whether or not ${DEST} exists yet.
    gcloud storage cp --recursive "gs://${CMS_BUCKET}/${prefix}" "${DEST}/${prefix}"
    copied=1
  fi
done

if [[ "${copied}" -eq 0 ]]; then
  echo "::notice::No CMS files in gs://${CMS_BUCKET} yet; nothing to back up."
  exit 0
fi
echo "backup=${DEST}"
