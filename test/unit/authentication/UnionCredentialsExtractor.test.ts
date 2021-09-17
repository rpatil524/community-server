import type { CredentialSet } from '../../../src/authentication/Credentials';
import type { CredentialsExtractor } from '../../../src/authentication/CredentialsExtractor';
import { AGENT, EVERYONE } from '../../../src/authentication/CredentialTypes';
import { UnionCredentialsExtractor } from '../../../src/authentication/UnionCredentialsExtractor';
import type { HttpRequest } from '../../../src/server/HttpRequest';

describe('A UnionCredentialsExtractor', (): void => {
  const agent: CredentialSet = { [AGENT]: { webId: 'http://test.com/#me' }};
  const everyone: CredentialSet = { [EVERYONE]: {}};
  const request: HttpRequest = {} as any;
  let extractors: jest.Mocked<CredentialsExtractor>[];
  let extractor: UnionCredentialsExtractor;

  beforeEach(async(): Promise<void> => {
    extractors = [
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(agent),
      } as any,
      {
        canHandle: jest.fn(),
        handle: jest.fn().mockResolvedValue(everyone),
      } as any,
    ];

    extractor = new UnionCredentialsExtractor(extractors);
  });

  it('combines the results of the extractors.', async(): Promise<void> => {
    await expect(extractor.handle(request)).resolves.toEqual({
      [AGENT]: agent.agent,
      [EVERYONE]: {},
    });
  });

  it('ignores undefined values.', async(): Promise<void> => {
    extractors[1].handle.mockResolvedValueOnce({
      [EVERYONE]: {},
      [AGENT]: undefined,
    });
    await expect(extractor.handle(request)).resolves.toEqual({
      [AGENT]: agent.agent,
      [EVERYONE]: {},
    });
  });
});
