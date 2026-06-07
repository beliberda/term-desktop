import {
  defaultShortcuts,
  SHORTCUT_IDS,
  shortcutsConfigSchema,
  type ShortcutId,
  type ShortcutsConfig,
} from '@/types/shortcuts';

export type ParsedShortcut = {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
};

const MODIFIER_ALIASES: Record<string, keyof Pick<ParsedShortcut, 'ctrl' | 'shift' | 'alt'>> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  cmd: 'ctrl',
  command: 'ctrl',
  meta: 'ctrl',
  shift: 'shift',
  alt: 'alt',
  option: 'alt',
};

function normalizeKeyPart(part: string): string | null {
  const trimmed = part.trim();
  if (!trimmed) return null;

  if (/^f([1-9]|1[0-2])$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^[0-9]$/.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z]$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (trimmed.length === 1) {
    return trimmed;
  }

  return null;
}

export function normalizeBinding(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const parts = trimmed.split('+').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';

  const modifiers: string[] = [];
  let keyPart: string | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    const modifier = MODIFIER_ALIASES[lower];
    if (modifier) {
      const label =
        modifier === 'ctrl' ? 'Ctrl' : modifier === 'shift' ? 'Shift' : 'Alt';
      if (!modifiers.includes(label)) {
        modifiers.push(label);
      }
      continue;
    }

    keyPart = normalizeKeyPart(part);
  }

  if (!keyPart) return '';

  const orderedModifiers = ['Ctrl', 'Shift', 'Alt'].filter((m) =>
    modifiers.includes(m),
  );

  return [...orderedModifiers, keyPart].join('+');
}

export function parseShortcut(binding: string): ParsedShortcut | null {
  const normalized = normalizeBinding(binding);
  if (!normalized) return null;

  const parts = normalized.split('+');
  const key = parts[parts.length - 1];
  const modifierParts = parts.slice(0, -1);

  return {
    ctrl: modifierParts.includes('Ctrl'),
    shift: modifierParts.includes('Shift'),
    alt: modifierParts.includes('Alt'),
    key,
  };
}

function eventKeyMatches(parsedKey: string, event: KeyboardEvent): boolean {
  if (parsedKey.startsWith('F') && /^F([1-9]|1[0-2])$/.test(parsedKey)) {
    return event.key === parsedKey;
  }

  if (/^[0-9]$/.test(parsedKey)) {
    return event.key === parsedKey;
  }

  return event.key.toLowerCase() === parsedKey.toLowerCase();
}

export function matchesShortcut(event: KeyboardEvent, binding: string): boolean {
  if (!binding.trim()) return false;

  const parsed = parseShortcut(binding);
  if (!parsed) return false;

  const ctrl = event.ctrlKey || event.metaKey;
  if (parsed.ctrl !== ctrl) return false;
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;

  return eventKeyMatches(parsed.key, event);
}

export function formatShortcutLabel(binding: string): string {
  const normalized = normalizeBinding(binding);
  return normalized;
}

export function bindingFromKeyboardEvent(event: KeyboardEvent): string {
  if (event.key === 'Escape' || event.key === 'Tab') return '';

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');

  const key = event.key;
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
    return parts.join('+');
  }

  if (/^F([1-9]|1[0-2])$/.test(key)) {
    parts.push(key);
    return parts.join('+');
  }

  if (key.length === 1) {
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  return '';
}

export function mergeShortcuts(partial?: Partial<ShortcutsConfig> | null): ShortcutsConfig {
  return { ...defaultShortcuts, ...partial };
}

export type ShortcutsValidationResult =
  | { ok: true; config: ShortcutsConfig }
  | { ok: false; code: 'shortcutsInvalid' | 'shortcutsDuplicate'; binding?: string };

export function validateShortcuts(
  config: unknown,
): ShortcutsValidationResult {
  const parsed = shortcutsConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, code: 'shortcutsInvalid' };
  }

  const normalized: ShortcutsConfig = { ...defaultShortcuts };
  for (const id of SHORTCUT_IDS) {
    normalized[id] = normalizeBinding(parsed.data[id] ?? '');
  }

  const used = new Map<string, ShortcutId>();
  for (const id of SHORTCUT_IDS) {
    const binding = normalized[id];
    if (!binding) continue;

    if (!parseShortcut(binding)) {
      return { ok: false, code: 'shortcutsInvalid' };
    }

    const existing = used.get(binding);
    if (existing) {
      return { ok: false, code: 'shortcutsDuplicate', binding };
    }
    used.set(binding, id);
  }

  return { ok: true, config: normalized };
}

export function parseShortcutsJson(raw: string): ShortcutsValidationResult {
  try {
    const data = JSON.parse(raw) as unknown;
    const merged = mergeShortcuts(
      typeof data === 'object' && data !== null
        ? (data as Partial<ShortcutsConfig>)
        : undefined,
    );
    return validateShortcuts(merged);
  } catch {
    return { ok: false, code: 'shortcutsInvalid' };
  }
}
