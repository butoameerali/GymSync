const DEFAULT_HOST = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'qwen2.5:7b';

/**
 * Small, bounded adapter for the local Ollama server.  The application keeps
 * all safety and workout decisions server-side; the model only writes the
 * natural-language coaching response.
 */
export const ollamaCoachService = {
  isEnabled() {
    return process.env.ENABLE_OLLAMA === 'true' || Boolean(process.env.OLLAMA_HOST);
  },

  async reply({ systemPrompt, message, history = [], timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS) || 120000 }) {
    if (!this.isEnabled()) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(process.env.OLLAMA_HOST || DEFAULT_HOST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
          stream: false,
          // 1024 context bounded for 7B on 8GB RAM to prevent Out Of Memory crashes
          options: {
            temperature: 0.4,
            top_p: 0.9,
            num_ctx: Number(process.env.OLLAMA_NUM_CTX) || 1024,
            num_predict: 180
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
        console.warn(`Local Ollama coach returned HTTP ${response.status}`);
        return null;
      }
      const data = await response.json();
      const content = data?.message?.content?.trim();
      return content && content.length > 2 ? content.slice(0, 2200) : null;
    } catch (error) {
      console.warn('Local Ollama coach unavailable:', error.name === 'AbortError' ? 'request timed out' : error.message);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
};

export default ollamaCoachService;
