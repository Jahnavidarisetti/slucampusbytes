const { DESCRIPTION_MAX_LENGTH } = require('./postValidation');

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const SUPPORTED_TONES = new Set([
  'professional',
  'friendly',
  'exciting',
  'concise',
]);

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

async function rewriteDescriptionWithGemini({ description, tone, fetchImpl = fetch }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured on the server.');
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `${GEMINI_API_BASE_URL}/${model}:generateContent`;

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
    error.statusCode = response.status >= 500 ? 502 : 500;
    throw error;
  }

  const rewrittenDescription = extractGeminiText(payload);

  if (!rewrittenDescription) {
    const error = new Error('Gemini did not return rewritten text.');
    error.statusCode = 502;
    throw error;
  }

  return rewrittenDescription;
}

module.exports = {
  extractGeminiText,
  rewriteDescriptionWithGemini,
  validateRewriteDescriptionPayload,
};
