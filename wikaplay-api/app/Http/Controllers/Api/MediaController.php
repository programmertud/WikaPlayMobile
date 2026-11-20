<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class MediaController extends Controller
{
    /**
     * Serve a media file stored in the persistent database or public storage disk.
     */
    public function serve(Request $request, string $path)
    {
        if ($request->isMethod('OPTIONS')) {
            return response('', 204, [
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers' => '*',
            ]);
        }

        $cleanPath = ltrim($path, '/');
        // Strip common prefixes
        $cleanPath = preg_replace('#^(?:storage/|api/media/|api/storage/|media/)?#', '', $cleanPath);
        $baseName = basename($cleanPath);

        // 1. Look up in persistent database storage
        $media = MediaFile::where('filename', $cleanPath)
            ->orWhere('filename', 'audio/' . $baseName)
            ->orWhere('filename', 'images/' . $baseName)
            ->orWhere('filename', 'like', '%' . $baseName)
            ->first();

        if ($media && ! empty($media->data)) {
            $binary = base64_decode($media->data);
            $mimeType = $media->mime_type ?: 'application/octet-stream';
            $size = strlen($binary);

            if ($request->isMethod('HEAD')) {
                return response('', 200, [
                    'Content-Type' => $mimeType,
                    'Content-Length' => $size,
                    'Access-Control-Allow-Origin' => '*',
                    'Accept-Ranges' => 'bytes',
                ]);
            }

            return response($binary, 200, [
                'Content-Type' => $mimeType,
                'Content-Length' => $size,
                'Cache-Control' => 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
                'Accept-Ranges' => 'bytes',
            ]);
        }

        // 2. Check local disk fallback
        $localPath = storage_path('app/public/' . $cleanPath);
        if (file_exists($localPath)) {
            return response()->file($localPath, [
                'Cache-Control' => 'public, max-age=31536000',
                'Access-Control-Allow-Origin' => '*',
            ]);
        }

        // 3. Fallback for public assets (e.g. public/audio)
        $publicAssetPath = public_path($cleanPath);
        if (file_exists($publicAssetPath)) {
            return response()->file($publicAssetPath, [
                'Cache-Control' => 'public, max-age=31536000',
                'Access-Control-Allow-Origin' => '*',
            ]);
        }

        return response()->json(['message' => 'Media file not found.'], 404);
    }
}
