/**
 * /api/tts — Google Cloud Text-to-Speech proxy.
 *
 * Uses Application Default Credentials (same ADC setup as Vertex AI).
 * Enable "Cloud Text-to-Speech API" in Google Cloud Console for your project.
 * Voice: en-US-Journey-D — Google's most natural conversational neural voice.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body?.text ?? "";

    if (!text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Strip markdown bold markers and cap length
    const cleaned = text.replace(/\*\*/g, "").trim().slice(0, 600);

    const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
    const client = new TextToSpeechClient();

    const [response] = await client.synthesizeSpeech({
      input: { text: cleaned },
      voice: {
        languageCode: "en-US",
        // Journey voices are Google's most natural conversational voices.
        // Falls back to Neural2-D if Journey is unavailable in your region.
        name: "en-US-Journey-D",
      },
      audioConfig: {
        audioEncoding: "MP3" as const,
        speakingRate: 1.05,
        volumeGainDb: 1.0,
      },
    });

    const audioContent = response.audioContent;
    if (!audioContent) {
      return NextResponse.json({ error: "empty audio response" }, { status: 500 });
    }

    // Convert to ArrayBuffer — Node Buffer extends Uint8Array but BodyInit expects ArrayBufferView
    const bytes = new Uint8Array(audioContent as Buffer);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[TTS]", err);
    return NextResponse.json({ error: "TTS unavailable" }, { status: 500 });
  }
}
