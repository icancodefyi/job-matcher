import { NextRequest, NextResponse } from "next/server";
import { analyzeResume } from "@/lib/resume/analyze";
import { extractPdfText } from "@/lib/resume/extractPdf";
import { profileStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

const MAX_PDF_BASE64 = 6 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let body: { resumeText?: string; name?: string; base64?: string; fileName?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  let resumeText = (body.resumeText ?? "").trim();

  if (body.base64) {
    if (body.base64.length > MAX_PDF_BASE64) {
      return NextResponse.json({ error: "PDF too large (max ~4.5 MB)" }, { status: 413 });
    }
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = Buffer.from(body.base64, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid PDF encoding" }, { status: 400 });
    }
    const isPdf =
      /\.pdf$/i.test(body.fileName ?? "") || pdfBuffer.subarray(0, 5).toString("latin1") === "%PDF-";
    if (!isPdf || pdfBuffer.length < 100) {
      return NextResponse.json({ error: "Uploaded file is not a valid PDF" }, { status: 400 });
    }

    const extracted = await extractPdfText(pdfBuffer).catch((err) => {
      throw new Error(`Could not read PDF: ${err instanceof Error ? err.message : String(err)}`);
    });
    if (!extracted) {
      return NextResponse.json(
        { error: "No extractable text in this PDF (it may be a scanned image)" },
        { status: 422 },
      );
    }
    resumeText = extracted.slice(0, 30000);
  }

  if (!resumeText) {
    return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
  }
  if (!body.base64 && resumeText.length > 30000) {
    return NextResponse.json({ error: "resumeText too large (max 30k chars)" }, { status: 413 });
  }

  const profile = await analyzeResume(resumeText, body.name);
  profileStore.save(profile);

  return NextResponse.json({ profile, extractedText: body.base64 ? resumeText : undefined });
}