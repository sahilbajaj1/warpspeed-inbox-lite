/**
 * Incremental SSE parser that tolerates chunk boundaries (SUM-01 / AMB-01).
 * Supports standard `event:` + `data:` frames and JSON payloads with a `type` field.
 */

export type ParsedSseFrame = {
  event: string;
  data: string;
  id?: string;
};

export type SummaryStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type SseParser = {
  push: (chunk: string) => ParsedSseFrame[];
  flush: () => ParsedSseFrame[];
};

export function createSseParser(): SseParser {
  let buffer = '';

  function consume(complete: boolean): ParsedSseFrame[] {
    const frames: ParsedSseFrame[] = [];
    // Normalize CRLF → LF for splitting.
    buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let separator = buffer.indexOf('\n\n');
    while (separator !== -1) {
      const raw = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const frame = parseFrame(raw);
      if (frame) {
        frames.push(frame);
      }
      separator = buffer.indexOf('\n\n');
    }

    if (complete && buffer.trim().length > 0) {
      const frame = parseFrame(buffer);
      buffer = '';
      if (frame) {
        frames.push(frame);
      }
    }

    return frames;
  }

  return {
    push(chunk) {
      buffer += chunk;
      return consume(false);
    },
    flush() {
      return consume(true);
    },
  };
}

function parseFrame(raw: string): ParsedSseFrame | null {
  const lines = raw.split('\n');
  let event = 'message';
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    if (field === 'event') {
      event = value;
    } else if (field === 'data') {
      dataLines.push(value);
    } else if (field === 'id') {
      id = value;
    }
  }

  if (dataLines.length === 0 && event === 'message') {
    return null;
  }

  return {
    event,
    data: dataLines.join('\n'),
    id,
  };
}

/** Map a raw SSE frame onto the summary domain events. */
export function mapSseFrameToSummaryEvent(frame: ParsedSseFrame): SummaryStreamEvent | null {
  const eventName = frame.event.toLowerCase();

  if (eventName === 'done' || eventName === 'end') {
    return { type: 'done' };
  }

  if (eventName === 'error') {
    return { type: 'error', message: extractErrorMessage(frame.data) };
  }

  if (eventName === 'delta' || eventName === 'message') {
    const text = extractDeltaText(frame.data);
    if (text !== null) {
      return { type: 'delta', text };
    }
    // Some servers send done/error as default event with typed JSON.
    const typed = parseTypedJson(frame.data);
    if (typed) {
      return typed;
    }
  }

  const typed = parseTypedJson(frame.data);
  if (typed) {
    return typed;
  }

  return null;
}

function extractDeltaText(data: string): string | null {
  if (!data) {
    return null;
  }
  try {
    const json = JSON.parse(data) as unknown;
    if (typeof json === 'string') {
      return json;
    }
    if (json && typeof json === 'object') {
      const record = json as Record<string, unknown>;
      if (typeof record.text === 'string') {
        return record.text;
      }
      if (typeof record.delta === 'string') {
        return record.delta;
      }
      if (typeof record.content === 'string') {
        return record.content;
      }
    }
  } catch {
    // Plain-text data line.
    return data;
  }
  return null;
}

function extractErrorMessage(data: string): string {
  if (!data) {
    return 'Summary failed.';
  }
  try {
    const json = JSON.parse(data) as unknown;
    if (json && typeof json === 'object') {
      const record = json as Record<string, unknown>;
      if (typeof record.message === 'string') {
        return record.message;
      }
      if (typeof record.error === 'string') {
        return record.error;
      }
    }
  } catch {
    return data;
  }
  return 'Summary failed.';
}

function parseTypedJson(data: string): SummaryStreamEvent | null {
  try {
    const json = JSON.parse(data) as unknown;
    if (!json || typeof json !== 'object') {
      return null;
    }
    const record = json as Record<string, unknown>;
    const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
    if (type === 'delta' || type === 'message') {
      const text =
        typeof record.text === 'string'
          ? record.text
          : typeof record.delta === 'string'
            ? record.delta
            : null;
      return text !== null ? { type: 'delta', text } : null;
    }
    if (type === 'done' || type === 'end') {
      return { type: 'done' };
    }
    if (type === 'error') {
      return {
        type: 'error',
        message:
          typeof record.message === 'string'
            ? record.message
            : typeof record.error === 'string'
              ? record.error
              : 'Summary failed.',
      };
    }
  } catch {
    return null;
  }
  return null;
}
