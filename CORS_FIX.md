# Firebase Storage CORS Configuration

If you are seeing `storage/unknown` errors when uploading images, it is likely because your Firebase Storage bucket is blocking requests from this domain.

## How to Fix

1. **Install gsutil**: If you don't have it, install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).
2. **Create a `cors.json` file**:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
3. **Apply the configuration**:
   Run this command in your terminal, replacing `YOUR_BUCKET_NAME` with your actual bucket name (e.g., `gen-lang-client-0430129528.firebasestorage.app`):
   ```bash
   gsutil cors set cors.json gs://YOUR_BUCKET_NAME
   ```

## Why this happens
Browsers block cross-origin requests by default for security. Since your app is running on a different domain than the Firebase Storage API, the bucket must explicitly allow this domain (or all domains using `*`) to receive uploads.
