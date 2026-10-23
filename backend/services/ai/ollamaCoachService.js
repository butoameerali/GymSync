const DEFAULT_HOST = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'qwen2.5:7b';

/**
 * Normalizes any host URL (local or remote tunnel like Cloudflare / Ngrok)
 * to ensure it points to the /api/chat endpoint.
 */
export const getOllamaChatUrl = (host) => {
  const target = (host || process.env.OLLAMA_HOST || DEFAULT_HOST).trim().replace(/\/+$/, '');
  return target.endsWith('/api/chat') ? target : `${target}/api/chat`;
};

/**
 * Normalizes host URL to base domain/port without /api/chat.
 */
export const getOllamaBaseUrl = (host) => {
  const target = (host || process.env.OLLAMA_HOST || DEFAULT_HOST).trim().replace(/\/+$/, '');
  return target.replace(/\/api\/chat\/?$/, '');
};

const COMMON_TUNNEL_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
  'Bypass-Tunnel-Reminder': 'true',
  'User-Agent': 'GymSync-AI-Client'
};

/**
 * Adapter for Ollama LLM service. Supports local instances as well as
 * high-performance remote Google Colab GPU instances exposed via Cloudflare/Ngrok tunnels.
 */
export const ollamaCoachService = {
  isEnabled() {
    return process.env.ENABLE_OLLAMA === 'true' || Boolean(process.env.OLLAMA_HOST);
  },

  getChatUrl(host) {
    return getOllamaChatUrl(host);
  },

  getBaseUrl(host) {
    return getOllamaBaseUrl(host);
  },

  /**
   * Health check to test connectivity to Ollama (local or Google Colab tunnel).
   */
  async checkHealth(customHost = null) {
    if (!this.isEnabled()) {
      return { online: false, reason: 'Ollama is disabled in .env configuration (ENABLE_OLLAMA=false)' };
    }

    const baseUrl = this.getBaseUrl(customHost);
    const chatUrl = this.getChatUrl(customHost);
    const configuredModel = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const startTime = Date.now();

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: COMMON_TUNNEL_HEADERS,
        signal: controller.signal
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          online: false,
          status: response.status,
          host: baseUrl,
          chatUrl,
          latencyMs,
          error: `Ollama endpoint responded with HTTP ${response.status}`
        };
      }

      const data = await response.json().catch(() => ({}));
      const models = Array.isArray(data?.models) ? data.models.map(m => m.name) : [];
      const modelLoaded = models.some(m => m.toLowerCase().includes(configuredModel.toLowerCase()));

      return {
        online: true,
        host: baseUrl,
        chatUrl,
        latencyMs,
        configuredModel,
        availableModels: models,
        modelLoaded,
        message: modelLoaded 
          ? `✅ Connected to Ollama (${latencyMs}ms). Model "${configuredModel}" is loaded and ready.`
          : `⚠️ Connected to Ollama (${latencyMs}ms), but model "${configuredModel}" was not found in: [${models.join(', ')}]. Please run "ollama pull ${configuredModel}" on Colab.`
      };
    } catch (error) {
      return {
        online: false,
        host: baseUrl,
        chatUrl,
        error: error.name === 'AbortError' ? 'Connection timed out after 10s' : error.message,
        tip: 'Check if Google Colab notebook is running and Cloudflare/Ngrok tunnel URL is active.'
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  async reply({ systemPrompt, message, history = [], timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS) || 120000 }) {
    if (!this.isEnabled()) return null;

    const chatEndpoint = this.getChatUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: COMMON_TUNNEL_HEADERS,
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
          stream: false,
          options: {
            temperature: 0.4,
            top_p: 0.9,
            num_ctx: Number(process.env.OLLAMA_NUM_CTX) || 2048,
            num_predict: 250
          },
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-6).map(item => ({
              role: (item.role === 'user' || item.sender === 'user') ? 'user' : 'assistant',
              content: String(item.content || item.text || '').slice(0, 500)
            })).filter(item => item.content.trim()),
            { role: 'user', content: String(message).slice(0, 1000) }
          ]
        })
      });

      if (!response.ok) {
        console.warn(`Ollama coach returned HTTP ${response.status} from ${chatEndpoint}`);
        return null;
      }

      const data = await response.json();
      const content = data?.message?.content?.trim();
      return content && content.length > 2 ? content.slice(0, 2500) : null;
    } catch (error) {
      console.warn('Ollama coach unavailable:', error.name === 'AbortError' ? 'request timed out' : error.message);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
};

export default ollamaCoachService;
