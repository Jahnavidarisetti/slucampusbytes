const assert = require('node:assert/strict');

const {
  extractGeminiText,
  rewriteDescriptionWithGemini,
  validateRewriteDescriptionPayload,
} = require('../utils/aiRewrite');

const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('validates rewrite payload', () => {
  assert.match(
    validateRewriteDescriptionPayload({ description: '', tone: 'friendly' }).error,
    /description is required/i
  );

  assert.match(
    validateRewriteDescriptionPayload({
      description: 'Valid description',
      tone: 'dramatic',
    }).error,
    /tone must be one of/i
  );

  assert.deepEqual(
    validateRewriteDescriptionPayload({
      description: '  Bring your resume for recruiting night.  ',
      tone: 'Friendly',
    }),
    {
      error: null,
      normalizedDescription: 'Bring your resume for recruiting night.',
      normalizedTone: 'friendly',
    }
  );
});

test('extracts output text from Gemini payload', () => {
  assert.equal(
    extractGeminiText({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'Join us this Friday for recruiting night.',
              },
            ],
          },
        },
      ],
    }),
    'Join us this Friday for recruiting night.'
  );
});

test('throws when GEMINI_API_KEY is missing', async () => {
  delete process.env.GEMINI_API_KEY;

  await assert.rejects(
    rewriteDescriptionWithGemini({
      description: 'Meet us in the student center.',
      tone: 'professional',
      fetchImpl: async () => {
        throw new Error('fetch should not run without an API key');
      },
    }),
    /GEMINI_API_KEY/i
  );
});

test('calls Gemini and returns rewritten text', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';

  let capturedRequest = null;

  const rewritten = await rewriteDescriptionWithGemini({
    description: 'Join us for the club fair this Thursday at 5 PM.',
    tone: 'exciting',
    fetchImpl: async (url, options) => {
      capturedRequest = { url, options };
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Get ready for the club fair this Thursday at 5 PM.',
                  },
                ],
              },
            },
          ],
        }),
      };
    },
  });

  assert.equal(
    capturedRequest.url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
  );
  assert.equal(capturedRequest.options.headers['x-goog-api-key'], 'test-key');

  const body = JSON.parse(capturedRequest.options.body);
  assert.equal(body.generationConfig.temperature, 0.3);
  assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(rewritten, 'Get ready for the club fair this Thursday at 5 PM.');
});

async function run() {
  let failures = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  if (originalApiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalApiKey;
  }

  if (originalModel === undefined) {
    delete process.env.GEMINI_MODEL;
  } else {
    process.env.GEMINI_MODEL = originalModel;
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${tests.length} tests`);
}

run();
