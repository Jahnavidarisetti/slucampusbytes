const { DESCRIPTION_MAX_LENGTH } = require('./postValidation');

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const SUPPORTED_TONES = new Set([
  'professional',
  'friendly',
  'exciting',
  'concise',
]);
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_PATTERNS = [
  /timed?\s*out/i,
  /timeout/i,
  /network/i,
  /failed to fetch/i,
  /fetch failed/i,
  /econnreset/i,
  /enotfound/i,
  /eai_again/i,
  /rate limit/i,
  /temporar/i,
];

function validateRewriteDescriptionPayload({ description, tone }) {
  const normalizedDescription =
    typeof description === 'string' ? description.trim() : '';
  const normalizedTone = typeof tone === 'string' ? tone.trim().toLowerCase() : '';

  if (!normalizedDescription) {
    return { error: 'Description is required.' };
  }

  if (normalizedDescription.length > DESCRIPTION_MAX_LENGTH) {
    return {
      error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!SUPPORTED_TONES.has(normalizedTone)) {
    return { error: 'Tone must be one of professional, friendly, exciting, or concise.' };
  }

  return {
    error: null,
    normalizedDescription,
    normalizedTone,
  };
}

function extractGeminiText(payload) {
  if (!Array.isArray(payload?.candidates)) {
    return '';
  }

  for (const candidate of payload.candidates) {
    if (!Array.isArray(candidate?.content?.parts)) {
      continue;
    }

    for (const part of candidate.content.parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const statusCode = Number(error?.statusCode);
  if (RETRYABLE_STATUS_CODES.has(statusCode)) {
    return true;
  }

  const message = String(error?.message || '');
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function buildDeterministicToneRewrite({ description, tone }) {
  const normalized = description.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  if (tone === 'concise') {
    const firstSentence =
      normalized.match(/.*?[.!?](?:\s|$)/)?.[0]?.trim() || normalized;
    return firstSentence.length > DESCRIPTION_MAX_LENGTH
      ? firstSentence.slice(0, DESCRIPTION_MAX_LENGTH)
      : firstSentence;
  }

  const trimmedTerminal = normalized.replace(/[.!?]+$/, '');

  if (tone === 'professional') {
    return `Please note: ${trimmedTerminal}.`;
  }

  if (tone === 'friendly') {
    return `Hey everyone, ${trimmedTerminal.charAt(0).toLowerCase()}${trimmedTerminal.slice(1)}.`;
  }

  if (tone === 'exciting') {
    return `Great news! ${trimmedTerminal}!`;
  }

  return normalized;
}

async function rewriteDescriptionWithGemini({
  description,
  tone,
  fetchImpl = fetch,
  maxRetries = 3,
  baseDelayMs = 300,
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured on the server.');
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `${GEMINI_API_BASE_URL}/${model}:generateContent`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text:
                  'Rewrite campus post descriptions for students. Preserve factual details, dates, times, locations, and calls to action. Match the requested tone. Return only the rewritten description text with no labels or quotation marks.',
              },
            ],
          },
          contents: [
            {
              parts: [
                {
                  text: `Tone: ${tone}\nDescription:\n${description}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(
          payload?.error?.message ||
            payload?.error ||
            'Gemini rewrite request failed.'
        );
        error.statusCode = response.status;
        throw error;
      }

      const rewrittenDescription = extractGeminiText(payload);

      if (!rewrittenDescription) {
        const error = new Error('Gemini did not return rewritten text.');
        error.statusCode = 502;
        throw error;
      }

      return rewrittenDescription;
    } catch (error) {
      const isLastAttempt = attempt >= maxRetries;
      if (isLastAttempt || !isRetryableError(error)) {
        if (error.statusCode && error.statusCode >= 500) {
          error.statusCode = 502;
        }
        throw error;
      }

      const backoffMs = baseDelayMs * (2 ** attempt);
      await sleep(backoffMs);
    }
  }

  const exhausted = new Error('Gemini rewrite retries exhausted.');
  exhausted.statusCode = 502;
  throw exhausted;
}

async function rewriteDescriptionWithGeminiFallback({
  description,
  tone,
  fetchImpl = fetch,
}) {
  try {
    return await rewriteDescriptionWithGemini({ description, tone, fetchImpl });
  } catch (_error) {
    return buildDeterministicToneRewrite({ description, tone });
  }
}

module.exports = {
  buildDeterministicToneRewrite,
  extractGeminiText,
  rewriteDescriptionWithGeminiFallback,
  rewriteDescriptionWithGemini,
  validateRewriteDescriptionPayload,
};
