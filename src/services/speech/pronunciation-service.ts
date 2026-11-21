import { Platform } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';

export interface PronunciationResult {
  is_correct: boolean;
  recognized_text: string;
  confidence: number;
  feedback: string;
}

const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

/**
 * Normalizes Tagalog text for comparison (lowercasing, trimming, removing accents).
 */
export function normalizeTagalogWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

/**
 * Evaluates spoken audio against expected Tagalog vocabulary word using Gemini AI.
 */
export async function evaluatePronunciation(
  audioUri: string,
  expectedWord: string,
  categoryName?: string
): Promise<PronunciationResult> {
  try {
    let base64Data = '';
    let mimeType = 'audio/m4a';

    if (Platform.OS === 'web') {
      const response = await fetch(audioUri);
      const blob = await response.blob();
      mimeType = blob.type || 'audio/webm';
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const b64 = res.split(',')[1] || res;
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      base64Data = await FileSystemLegacy.readAsStringAsync(audioUri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });
      if (audioUri.endsWith('.mp3')) {
        mimeType = 'audio/mp3';
      } else if (audioUri.endsWith('.wav')) {
        mimeType = 'audio/wav';
      } else {
        mimeType = 'audio/m4a';
      }
    }

    if (!base64Data || base64Data.length < 50) {
      return {
        is_correct: false,
        recognized_text: 'walang narinig',
        confidence: 0,
        feedback: 'Walang narinig na boses. Pakipindot ang mikropono at sabihin ang salita.',
      };
    }

    const apiKey = DEFAULT_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const prompt = `You are a patient, encouraging Kindergarten teacher evaluating a Filipino child's spoken pronunciation in Tagalog.
Expected Tagalog vocabulary word: "${expectedWord}" ${categoryName ? `(Category: ${categoryName})` : ''}.

Task:
1. Listen to the student's voice recording in the audio.
2. Determine if the student spoke and pronounced the expected Tagalog word "${expectedWord}".
- Be warm and tolerant of typical Kindergarten speech characteristics (e.g. slight articulation differences, e/i or o/u vowel shifts, child pitch).
- Strict Rule: Do NOT mark as correct if the student spoke a completely different word, made unrelated sounds, or remained silent. Do NOT mark correct merely because sound or noise was detected.
3. Respond ONLY in valid JSON with this exact schema:
{
  "is_correct": boolean,
  "recognized_text": "the word or phrase recognized from student speech",
  "confidence": number from 0 to 100,
  "feedback": "encouraging Tagalog feedback message"
}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn('Gemini pronunciation evaluation returned error:', errBody);
      return {
        is_correct: false,
        recognized_text: '',
        confidence: 0,
        feedback: 'Hindi nasuri ang boses. Pakisubukang muli.',
      };
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      return {
        is_correct: false,
        recognized_text: '',
        confidence: 0,
        feedback: 'Subukan mong muli! Kaya mo yan!',
      };
    }

    const parsed: PronunciationResult = JSON.parse(rawJson);

    // Double check with local normalized string matching as a safety guard
    const normExpected = normalizeTagalogWord(expectedWord);
    const normRecognized = normalizeTagalogWord(parsed.recognized_text || '');

    // Allow buko <-> niyog alias
    const isAliasMatch =
      (normExpected === 'buko' && normRecognized.includes('niyog')) ||
      (normExpected === 'niyog' && normRecognized.includes('buko'));

    if (isAliasMatch) {
      parsed.is_correct = true;
      parsed.feedback = 'Tama! Magaling!';
    } else if (normRecognized && normRecognized.includes(normExpected)) {
      parsed.is_correct = true;
    }

    return parsed;
  } catch (error: any) {
    console.error('Error in evaluatePronunciation:', error);
    return {
      is_correct: false,
      recognized_text: '',
      confidence: 0,
      feedback: 'May aberya sa koneksyon. Pakisubukan muli!',
    };
  }
}
