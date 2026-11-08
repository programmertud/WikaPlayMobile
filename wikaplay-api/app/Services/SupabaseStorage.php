<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupabaseStorage
{
    /**
     * Upload raw binary content to Supabase Storage and return the public CDN URL.
     */
    public static function upload(
        string $fileContent,
        string $path,
        string $mimeType = 'application/octet-stream'
    ): ?string {
        $baseUrl = config('services.supabase.url') ?: env('SUPABASE_URL', 'https://xkkxbuulfvyblfvbhccs.supabase.co');
        $key = config('services.supabase.key') ?: env('SUPABASE_KEY');
        $bucket = config('services.supabase.bucket') ?: env('SUPABASE_BUCKET', 'wikaplay');

        if (empty($baseUrl) || empty($key)) {
            Log::warning('[SupabaseStorage] Missing URL or Key. Cannot upload.');
            return null;
        }

        $cleanUrl = rtrim($baseUrl, '/');
        $cleanPath = ltrim($path, '/');

        try {
            $endpoint = "{$cleanUrl}/storage/v1/object/{$bucket}/{$cleanPath}";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$key}",
                'apikey' => $key,
                'Content-Type' => $mimeType,
                'x-upsert' => 'true',
            ])->withBody($fileContent, $mimeType)->post($endpoint);

            if ($response->successful()) {
                return "{$cleanUrl}/storage/v1/object/public/{$bucket}/{$cleanPath}";
            }

            Log::error('[SupabaseStorage] Upload error: ' . $response->status(), [
                'body' => $response->body(),
                'path' => $cleanPath,
            ]);
        } catch (\Throwable $e) {
            Log::error('[SupabaseStorage] Exception during upload: ' . $e->getMessage());
        }

        return null;
    }
}
