const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getEnv(name) {
  return import.meta.env[name] || '';
}

function buildHeaders(apiKey) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const appUrl = getEnv('VITE_APP_URL');
  if (appUrl) headers['HTTP-Referer'] = appUrl;
  headers['X-Title'] = 'FocusFlow';

  return headers;
}

export function getAiConfigStatus() {
  const apiKey = getEnv('VITE_OPENROUTER_API_KEY');
  const model = getEnv('VITE_OPENROUTER_MODEL') || 'openai/gpt-4o-mini';

  return {
    configured: Boolean(apiKey),
    model,
  };
}

export async function askOpenRouter(prompt, options = {}) {
  const apiKey = getEnv('VITE_OPENROUTER_API_KEY');
  const model = options.model || getEnv('VITE_OPENROUTER_MODEL') || 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY in .env');
  }

  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt cannot be empty.');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'You are FocusFlow AI assistant. Keep responses concise and practical.',
        },
        {
          role: 'user',
          content: prompt.trim(),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorText.slice(0, 220)}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content;
  if (!message) {
    throw new Error('OpenRouter returned no message content.');
  }

  return {
    text: message,
    model: data?.model || model,
    usage: data?.usage || null,
  };
}
