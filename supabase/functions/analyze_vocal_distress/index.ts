import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://banana-navy.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const CRITICAL_PATTERNS: Array<[string, RegExp]> = [
  ["CHOKING", /(je m(?:['’]|\s)+étouffe|il s(?:['’]|\s)+étouffe|elle s(?:['’]|\s)+étouffe|étouffement|suffoque|suffocation|\[choking\])/i],
  ["RESPIRATORY_DISTRESS", /(je n(?:['’]|\s)+arrive plus à respirer|ne respire plus|impossible de respirer|manque d(?:['’]|\s)+air|\[gasping\])/i],
  ["LOSS_OF_CONSCIOUSNESS", /(perd connaissance|perdu connaissance|inconscient|inconsciente|je vais m(?:['’]|\s)+évanouir|s(?:['’]|\s)+évanouit)/i],
];

const WARNING_PATTERNS: Array<[string, RegExp]> = [
  ["SEVERE_COUGH", /(toux intense|tousse sans arrêt|\[coughing\])/i],
  ["CONFUSION", /(je suis confus|je suis confuse|ne sait plus où|désorienté|désorientée)/i],
  ["CHEST_PAIN", /(douleur thoracique|mal à la poitrine)/i],
  ["SEVERE_MALAISE", /(malaise grave|très faible|n(?:['’]|\s)+arrive plus à parler)/i],
];

const ENGLISH_MARKERS = /\b(hello|help me|i can(?:not|'t) breathe|english|please help|what should i do)\b/i;
const DUTCH_MARKERS = /\b(hallo|help mij|ik kan niet ademen|nederlands|wat moet ik doen|alsjeblieft)\b/i;

function cors(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://banana-navy.github.io";
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-headers": "authorization, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "content-type": "application/json; charset=utf-8",
    "vary": "Origin",
  };
}

function json(origin: string | null, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json(origin, { ok: false, error: "method_not_allowed" }, 405);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(origin, { ok: false, error: "origin_not_allowed" }, 403);

  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
  const expectedKey = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!expectedKey || req.headers.get("apikey") !== expectedKey) {
    return json(origin, { ok: false, error: "invalid_api_key" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(origin, { ok: false, error: "invalid_json" }, 400);
  }

  const transcript = String(body.transcript ?? "").trim().slice(0, 1200);
  if (!transcript) return json(origin, { ok: false, error: "transcript_required" }, 422);

  const critical = CRITICAL_PATTERNS.filter(([, pattern]) => pattern.test(transcript)).map(([code]) => code);
  const warnings = WARNING_PATTERNS.filter(([, pattern]) => pattern.test(transcript)).map(([code]) => code);
  const detectedLanguage = ENGLISH_MARKERS.test(transcript) ? "en" : DUTCH_MARKERS.test(transcript) ? "nl" : "fr_or_unknown";

  const audio = body.audio && typeof body.audio === "object" ? body.audio as Record<string, unknown> : {};
  const vadPeak = Math.max(0, Math.min(1, Number(audio.vad_peak) || 0));
  const inputVolumePeak = Math.max(0, Math.min(1, Number(audio.input_volume_peak) || 0));
  const acousticSupport = critical.length > 0 && (vadPeak >= 0.65 || inputVolumePeak >= 0.35);
  const emergency = critical.length > 0;

  return json(origin, {
    ok: true,
    version: "seveso-distress-rules-1.0.0",
    level: emergency ? "emergency" : warnings.length ? "warning" : "none",
    reason_codes: [...critical, ...warnings],
    detected_language: detectedLanguage,
    acoustic_support: acousticSupport,
    should_interrupt_demo: emergency,
    instruction: emergency
      ? "Votre état peut être grave. Raccrochez maintenant et appelez immédiatement le 112, ou demandez à une personne près de vous de le faire. Cette démonstration ne peut pas transférer l'appel."
      : null,
    limitations: "Évaluation déterministe de signaux déclarés ou transcrits. Aucun diagnostic médical.",
  });
});
