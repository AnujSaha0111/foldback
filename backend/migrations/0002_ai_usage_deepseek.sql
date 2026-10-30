-- DeepSeek joins the rule reader's chain as a prepaid, capped provider (docs/spec/ai.md). The ai_usage table must be
-- able to record its attempts. The OpenRouter rule stays exactly as it was: an OpenRouter row must be a free model.
ALTER TABLE ai_usage
  DROP CONSTRAINT ai_usage_provider_valid,
  DROP CONSTRAINT ai_usage_free_only;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_provider_valid CHECK (provider IN ('gemini', 'groq', 'openrouter', 'deepseek')),
  ADD CONSTRAINT ai_usage_openrouter_free_only CHECK (
    provider <> 'openrouter' OR model = 'openrouter/free' OR model LIKE '%:free');
