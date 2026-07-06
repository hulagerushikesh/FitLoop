import { retryWithBackoff } from '../retry';

const noSleep = () => Promise.resolve();

describe('retryWithBackoff', () => {
  it('returns immediately on success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(retryWithBackoff(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries once then succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue('ok');
    await expect(retryWithBackoff(fn, { retries: 1, sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('down'));
    await expect(retryWithBackoff(fn, { retries: 2, sleep: noSleep })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry when shouldRetry is false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('4xx'));
    await expect(
      retryWithBackoff(fn, { retries: 3, sleep: noSleep, shouldRetry: () => false })
    ).rejects.toThrow('4xx');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
