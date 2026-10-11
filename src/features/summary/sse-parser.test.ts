import {
  createSseParser,
  mapSseFrameToSummaryEvent,
} from '@/features/summary/sse-parser';

describe('createSseParser', () => {
  it('parses events split across chunks', () => {
    const parser = createSseParser();
    const first = parser.push('event: delta\ndata: {"text":"Hel');
    expect(first).toHaveLength(0);

    const second = parser.push('lo"}\n\nevent: delta\ndata: {"text":" world"}\n\n');
    expect(second).toHaveLength(2);
    expect(mapSseFrameToSummaryEvent(second[0]!)).toEqual({ type: 'delta', text: 'Hello' });
    expect(mapSseFrameToSummaryEvent(second[1]!)).toEqual({ type: 'delta', text: ' world' });
  });

  it('handles multiple events in one chunk and a done frame', () => {
    const parser = createSseParser();
    const frames = parser.push(
      'event: delta\ndata: {"text":"A"}\n\nevent: delta\ndata: {"text":"B"}\n\nevent: done\ndata: {}\n\n',
    );
    expect(frames.map(mapSseFrameToSummaryEvent)).toEqual([
      { type: 'delta', text: 'A' },
      { type: 'delta', text: 'B' },
      { type: 'done' },
    ]);
  });

  it('maps typed JSON on the default message event', () => {
    const parser = createSseParser();
    const frames = parser.push('data: {"type":"error","message":"boom"}\n\n');
    expect(mapSseFrameToSummaryEvent(frames[0]!)).toEqual({
      type: 'error',
      message: 'boom',
    });
  });

  it('flushes a trailing frame without blank line terminator', () => {
    const parser = createSseParser();
    parser.push('event: done\ndata: {}');
    const frames = parser.flush();
    expect(mapSseFrameToSummaryEvent(frames[0]!)).toEqual({ type: 'done' });
  });
});
