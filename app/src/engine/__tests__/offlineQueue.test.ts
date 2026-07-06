import { replayQueue, type QueuedWrite } from '../offlineQueue';

function write(id: string): QueuedWrite<{ n: number }> {
  return { id, type: 'logSet', payload: { n: Number(id) }, createdAt: Number(id) };
}

describe('replayQueue', () => {
  it('drains the whole queue when every write succeeds', async () => {
    const seen: string[] = [];
    const remaining = await replayQueue([write('1'), write('2'), write('3')], async (w) => {
      seen.push(w.id);
    });
    expect(seen).toEqual(['1', '2', '3']);
    expect(remaining).toEqual([]);
  });

  it('stops at the first failure and preserves order of the rest', async () => {
    const seen: string[] = [];
    const remaining = await replayQueue([write('1'), write('2'), write('3')], async (w) => {
      if (w.id === '2') throw new Error('offline again');
      seen.push(w.id);
    });
    expect(seen).toEqual(['1']); // 3 is NOT applied before 2
    expect(remaining.map((w) => w.id)).toEqual(['2', '3']);
  });

  it('keeps everything when the first write fails', async () => {
    const remaining = await replayQueue([write('1'), write('2')], async () => {
      throw new Error('still offline');
    });
    expect(remaining.map((w) => w.id)).toEqual(['1', '2']);
  });
});
