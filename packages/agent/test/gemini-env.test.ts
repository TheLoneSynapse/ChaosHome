import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEMINI_MODEL_ID,
  geminiThinkingBudget,
  resolveGeminiModelId,
} from '../src/gemini-env.js';

describe('resolveGeminiModelId', () => {
  it('prefers the documented GEMINI_MODEL over the legacy id', () => {
    expect(resolveGeminiModelId({ GEMINI_MODEL: 'gemini-2.5-flash', GEMINI_MODEL_ID: 'legacy-model' })).toBe(
      'gemini-2.5-flash'
    );
  });

  it('falls back to GEMINI_MODEL_ID for backwards compatibility', () => {
    expect(resolveGeminiModelId({ GEMINI_MODEL_ID: 'legacy-model' })).toBe('legacy-model');
  });

  it('uses the default when neither var is set', () => {
    expect(resolveGeminiModelId({})).toBe(DEFAULT_GEMINI_MODEL_ID);
  });

  it('treats a blank value as unset', () => {
    expect(resolveGeminiModelId({ GEMINI_MODEL: '   ' })).toBe(DEFAULT_GEMINI_MODEL_ID);
  });

  it('trims surrounding whitespace from the model id', () => {
    expect(resolveGeminiModelId({ GEMINI_MODEL: ' gemini-2.5-flash ' })).toBe('gemini-2.5-flash');
  });
});

describe('geminiThinkingBudget', () => {
  it('defaults to 0 so chat stays responsive', () => {
    expect(geminiThinkingBudget({})).toBe(0);
  });

  it('honours an explicit budget', () => {
    expect(geminiThinkingBudget({ GEMINI_THINKING_BUDGET: '1024' })).toBe(1024);
  });

  it('rejects non-numeric values by falling back to 0', () => {
    expect(geminiThinkingBudget({ GEMINI_THINKING_BUDGET: 'lots' })).toBe(0);
  });

  it('rejects negative budgets by falling back to 0', () => {
    expect(geminiThinkingBudget({ GEMINI_THINKING_BUDGET: '-5' })).toBe(0);
  });

  it('trims whitespace before parsing', () => {
    expect(geminiThinkingBudget({ GEMINI_THINKING_BUDGET: ' 256 ' })).toBe(256);
  });
});
