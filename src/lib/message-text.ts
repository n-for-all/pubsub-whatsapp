/**
 * Extract human-readable text from WhatsApp message payloads.
 * Handles all message types: text, interactive, media, location, template, etc.
 */
export function extractMessageText(payload: any): string {
    if (!payload) return "";
    const type: string = payload.type ?? "";

    // ── Conversation ended marker ─────────────────────────────────────────────
    if (type === "conversation-ended") {
        return payload.reason === "timeout" ? "⏱ Conversation timed out" : "✅ Conversation completed";
    }

    // ── Lead context (collected answers) ─────────────────────────────────────
    if (type === "lead-context") {
        const ctx = payload.context ?? {};
        const parts = Object.entries(ctx).map(([k, v]) => `${k}: ${v}`);
        return parts.length ? parts.join(" | ") : "Lead context recorded";
    }

    // ── Interactive messages (buttons, lists) ────────────────────────────────
    if (type === "interactive" || payload.interactive) {
        const ia = payload.interactive ?? {};
        // Display body text if present
        if (ia.body?.text) return ia.body.text;
        // User's reply text
        if (ia.button_reply?.title) return ia.button_reply.title;
        if (ia.list_reply?.title) return ia.list_reply.title;
        // For outbound: show header or action buttons
        if (ia.header?.text) return ia.header.text;
        const buttons: any[] = ia.action?.buttons ?? [];
        if (buttons.length) {
            return buttons.map((b) => b.reply?.title ?? b.title ?? "").filter(Boolean).join(" / ");
        }
    }

    // ── Plain text ────────────────────────────────────────────────────────────
    if (type === "text" || payload.text) {
        const t = payload.text;
        if (typeof t === "string") return t;
        if (typeof t?.body === "string") return t.body;
    }

    // ── Media with captions (image, video, audio, document, sticker) ──────────
    if (type === "image" || payload.image) {
        const img = payload.image ?? {};
        return img.caption ?? "[Image]";
    }
    if (type === "video" || payload.video) {
        const vid = payload.video ?? {};
        return vid.caption ?? "[Video]";
    }
    if (type === "audio" || payload.audio) {
        return "[Audio]";
    }
    if (type === "document" || payload.document) {
        const doc = payload.document ?? {};
        return doc.filename ?? doc.caption ?? "[Document]";
    }
    if (type === "sticker" || payload.sticker) {
        return "[Sticker]";
    }

    // ── Location ──────────────────────────────────────────────────────────────
    if (type === "location" || payload.location) {
        const loc = payload.location ?? {};
        const parts = [loc.name, loc.address, `${loc.latitude}, ${loc.longitude}`].filter(Boolean);
        return parts.length > 0 ? parts.join(" • ") : "[Location]";
    }

    // ── Template ──────────────────────────────────────────────────────────────
    if (type === "template" || payload.template) {
        const tpl = payload.template ?? {};
        return tpl.name ?? "[Template]";
    }

    // ── CTA Button (Call-to-Action) ───────────────────────────────────────────
    if (type === "cta_url" || type === "cta_call") {
        return `[${type === "cta_call" ? "Call" : "Link"}]`;
    }

    // ── Body/Caption fallback ─────────────────────────────────────────────────
    if (typeof payload.body === "string") return payload.body;
    if (typeof payload.body?.text === "string") return payload.body.text;
    if (typeof payload.caption === "string") return payload.caption;

    // ── Type fallback ─────────────────────────────────────────────────────────
    return type ? `[${type}]` : "";
}
