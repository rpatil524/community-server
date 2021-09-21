import { AGENT, EVERYONE } from '../../../src/authentication/CredentialTypes';
import type { PermissionReader, PermissionReaderInput } from '../../../src/authorization/PermissionReader';
import { UnionReader } from '../../../src/authorization/UnionReader';

describe('A UnionReader', (): void => {
  const input: PermissionReaderInput = { credentials: {}, identifier: { path: 'http://test.com/foo' }};
  let readers: jest.Mocked<PermissionReader>[];
  let unionReader: UnionReader;

  beforeEach(async(): Promise<void> => {
    readers = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue({}),
      } as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue({}),
      } as any,
    ];

    unionReader = new UnionReader(readers);
  });

  it('only uses the results of readers that can handle the input.', async(): Promise<void> => {
    readers[0].canHandle.mockRejectedValue(new Error('bad request'));
    readers[0].handle.mockResolvedValue({ [AGENT]: { read: true }});
    readers[1].handle.mockResolvedValue({ [AGENT]: { write: true }});
    await expect(unionReader.handle(input)).resolves.toEqual({ [AGENT]: { write: true }});
  });

  it('combines results.', async(): Promise<void> => {
    readers[0].handle.mockResolvedValue({ [AGENT]: { read: true }, [EVERYONE]: undefined });
    readers[1].handle.mockResolvedValue({ [AGENT]: { write: true }, [EVERYONE]: { read: false }});
    await expect(unionReader.handle(input)).resolves.toEqual({
      [AGENT]: { read: true, write: true },
      [EVERYONE]: { read: false },
    });
  });

  it('merges same fields using false > true > undefined.', async(): Promise<void> => {
    readers[0].handle.mockResolvedValue(
      { [AGENT]: { read: true, write: false, append: undefined, create: true, delete: undefined }},
    );
    readers[1].handle.mockResolvedValue(
      { [AGENT]: { read: false, write: true, append: true, create: true, delete: undefined }},
    );
    await expect(unionReader.handle(input)).resolves.toEqual({
      [AGENT]: { read: false, write: false, append: true, create: true },
    });
  });
});
