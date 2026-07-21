import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { upsertHeliusWebhook } from "@/lib/heliusWebhook";

async function syncWebhook() {
  const db = getAdminDb();
  const whalesSnap = await db.collection("whales").get();
  const addresses = whalesSnap.docs.map((d) => d.data().address as string);

  const configRef = db.collection("config").doc("heliusWebhook");
  const configSnap = await configRef.get();
  const existingId = configSnap.exists ? (configSnap.data()?.webhookId as string) : null;

  const webhookId = await upsertHeliusWebhook(addresses, existingId);
  await configRef.set({ webhookId }, { merge: true });
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("whales").orderBy("createdAt", "desc").get();
    const whales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ whales });
  } catch (err) {
    console.error("GET /whales error:", err);
    return NextResponse.json({ error: "Gagal mengambil watchlist." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, label, copyAmountSol, autoApprove } = await req.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Alamat wallet whale wajib diisi." }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = await db.collection("whales").add({
      address: address.trim(),
      label: label?.trim() || "Whale tanpa nama",
      copyAmountSol: typeof copyAmountSol === "number" ? copyAmountSol : 0,
      autoApprove: Boolean(autoApprove),
      createdAt: Date.now(),
    });

    await syncWebhook();

    return NextResponse.json({ id: docRef.id });
  } catch (err) {
    console.error("POST /whales error:", err);
    return NextResponse.json({ error: "Gagal menambah whale ke watchlist." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });

    const db = getAdminDb();
    await db.collection("whales").doc(id).delete();
    await syncWebhook();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /whales error:", err);
    return NextResponse.json({ error: "Gagal menghapus whale." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, copyAmountSol, autoApprove } = await req.json();
    if (!id) return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });

    const update: Record<string, any> = {};
    if (typeof copyAmountSol === "number") update.copyAmountSol = copyAmountSol;
    if (typeof autoApprove === "boolean") update.autoApprove = autoApprove;

    const db = getAdminDb();
    await db.collection("whales").doc(id).update(update);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /whales error:", err);
    return NextResponse.json({ error: "Gagal update whale." }, { status: 500 });
  }
}
