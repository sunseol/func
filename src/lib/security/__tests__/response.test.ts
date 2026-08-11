import { ensureSuccessfulResponse } from '../validation';

describe('ensureSuccessfulResponse', () => {
  it('rejects failed responses with the server error message', async () => {
    const response = {
      ok: false,
      json: async () => ({ error: '삭제 권한이 없습니다.' }),
    } as Response;

    await expect(ensureSuccessfulResponse(response, '문서 삭제에 실패했습니다.')).rejects.toThrow('삭제 권한이 없습니다.');
  });

  it('resolves successful responses without reading a body', async () => {
    const response = { ok: true } as Response;

    await expect(ensureSuccessfulResponse(response, '문서 삭제에 실패했습니다.')).resolves.toBeUndefined();
  });
});
