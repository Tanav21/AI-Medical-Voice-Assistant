// app/api/extract-doctor-report/route.ts
export const runtime = "node";

import { NextRequest, NextResponse } from "next/server";

/**
 * Extract text from uploaded files:
 * - .txt -> return raw text
 * - .pdf -> pdfjs-dist (build/pdf.mjs)
 * - image/* -> tesseract.js OCR
 *
 * Notes:
 * - Install dependencies: npm i pdfjs-dist tesseract.js
 * - Add types/pdfjs-dist.d.ts as previously discussed to silence TS for pdfjs import.
 */

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB limit

async function extractPdfText(u8: Uint8Array): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist/build/pdf.mjs");
  // Disable worker in node
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  } catch {
    // ignore if cannot set
  }

  const loadingTask = pdfjsLib.getDocument({ data: u8 });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => (item && item.str) ? item.str : "").join(" ");
      parts.push(strings);
    } catch (pageErr) {
      console.warn(`extractPdfText: failed page ${i}:`, pageErr);
    }
  }

  return parts.join("\n\n");
}

async function ocrImageBuffer(buf: Buffer): Promise<string> {
  // dynamic import and use any to avoid TS type mismatch
  const tesseractModule: any = await import("tesseract.js");
  // obtain createWorker (could be default or named)
  const createWorker = tesseractModule.createWorker ?? tesseractModule.default?.createWorker;
  if (!createWorker) throw new Error("tesseract.js createWorker not found; ensure tesseract.js is installed");

  // create worker WITH NO ARGUMENTS (do not pass "eng" here)
  const worker: any = createWorker();

  try {
    // load & init english language explicitly
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // tesseract.js accepts Buffer in Node env
    const { data } = await worker.recognize(buf);
    return data?.text ?? "";
  } finally {
    try {
      await worker.terminate();
    } catch (e) {
      console.warn("worker.terminate failed", e);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer) return NextResponse.json({ error: "Failed to read file" }, { status: 400 });

    const size = arrayBuffer.byteLength;
    if (size > MAX_BYTES) return NextResponse.json({ error: `File too large. Max ${MAX_BYTES} bytes allowed.` }, { status: 413 });

    const name = (file as any).name || "";
    const mime = file.type || "";
    const buffer = Buffer.from(arrayBuffer);

    // Plain text
    if (mime === "text/plain" || name.toLowerCase().endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      return NextResponse.json({ text });
    }

    // PDF
    if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
      try {
        const u8 = new Uint8Array(arrayBuffer);
        const text = await extractPdfText(u8);
        if (!text || text.trim().length === 0) {
          return NextResponse.json({ error: "PDF parsed but no text found" }, { status: 422 });
        }
        return NextResponse.json({ text });
      } catch (pdfErr: any) {
        console.error("PDF parse error:", pdfErr);
        return NextResponse.json({ error: "PDF parsing failed: " + (pdfErr?.message ?? String(pdfErr)) }, { status: 500 });
      }
    }

    // Image -> OCR
    if (mime.startsWith("image/") || /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(name)) {
      try {
        const text = await ocrImageBuffer(buffer);
        if (!text || text.trim().length === 0) {
          return NextResponse.json({ error: "OCR completed but no text found. Try a clearer scan." }, { status: 422 });
        }
        return NextResponse.json({ text });
      } catch (ocrErr: any) {
        console.error("OCR error:", ocrErr);
        return NextResponse.json({ error: "OCR failed: " + (ocrErr?.message ?? String(ocrErr)) }, { status: 500 });
      }
    }

    return NextResponse.json({ error: `Unsupported file type: ${mime || name}` }, { status: 400 });
  } catch (err: any) {
    console.error("extract-doctor-report unexpected error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal Server Error" }, { status: 500 });
  }
}
