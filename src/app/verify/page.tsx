'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { extractBatchId } from '@/lib/batchVerification';

/** Minimal typing for the browser BarcodeDetector API (Chrome on Android). */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const SCAN_INTERVAL_MS = 400;

function barcodeDetector(): BarcodeDetectorConstructor | null {
  const detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  return detector ?? null;
}

export default function VerifyScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) return;
    const Detector = barcodeDetector();
    if (!Detector) {
      setCameraError('Your browser cannot scan QR codes. Type the code printed under it instead.');
      setScanning(false);
      return;
    }

    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const detector = new Detector({ formats: ['qr_code'] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        timer = setInterval(() => {
          void detector.detect(video).then((codes) => {
            const batchId = codes
              .map((found) => extractBatchId(found.rawValue))
              .find((id): id is string => Boolean(id));
            if (batchId) {
              router.push(`/verify/${batchId}`);
            }
          });
        }, SCAN_INTERVAL_MS);
      })
      .catch(() => {
        setCameraError('Camera access was blocked. Allow the camera, or type the code instead.');
        setScanning(false);
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning, router]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const batchId = extractBatchId(code);
    if (!batchId) {
      setCodeError('Enter the 64-character code or the full verification link.');
      return;
    }
    router.push(`/verify/${batchId}`);
  }

  return (
    <main className="max-w-xl mx-auto px-5 sm:px-8 py-24">
      <h1 className="text-2xl font-bold text-text-1">Check a drug pack</h1>
      <p className="mt-2 text-text-2">
        Scan the QR code on an orthodox or native drug pack to see who made it, who has handled it,
        and whether it has expired or been recalled.
      </p>

      <div className="mt-6 card p-4">
        {scanning ? (
          <>
            <video
              ref={videoRef}
              className="aspect-square w-full rounded-lg bg-black object-cover"
              muted
              playsInline
              aria-label="Camera preview for scanning the QR code"
            />
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="btn-secondary mt-3 inline-flex items-center gap-2"
            >
              <CameraOff className="w-4 h-4" aria-hidden /> Stop camera
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCameraError(null);
              setScanning(true);
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Camera className="w-4 h-4" aria-hidden /> Scan QR code
          </button>
        )}
        {cameraError && <p className="mt-3 text-sm text-amber-300">{cameraError}</p>}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-2">
        <label htmlFor="batch-code" className="block text-sm text-text-2">
          Or type the code printed under the QR code
        </label>
        <div className="flex gap-2">
          <input
            id="batch-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setCodeError(null);
            }}
            placeholder="64-character batch code"
            className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 font-mono text-sm text-text-1"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            <ScanLine className="w-4 h-4" aria-hidden /> Check
          </button>
        </div>
        {codeError && <p className="text-sm text-red-400">{codeError}</p>}
      </form>
    </main>
  );
}
