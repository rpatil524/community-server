import { AGENT, EVERYONE } from '../../../src/authentication/CredentialTypes';
import { AllStaticReader } from '../../../src/authorization/AllStaticReader';
import type { Permissions } from '../../../src/ldp/permissions/Permissions';

function getPermissions(allow: boolean): Permissions {
  return {
    read: allow,
    write: allow,
    append: allow,
    control: allow,
  };
}

describe('An AllStaticReader', (): void => {
  const credentials = { [AGENT]: {}, [EVERYONE]: undefined };
  const identifier = { path: 'http://test.com/resource' };

  it('can handle everything.', async(): Promise<void> => {
    const authorizer = new AllStaticReader(true);
    await expect(authorizer.canHandle({} as any)).resolves.toBeUndefined();
  });

  it('always returns permissions matching the given allow parameter.', async(): Promise<void> => {
    let authorizer = new AllStaticReader(true);
    await expect(authorizer.handle({ credentials, identifier })).resolves.toEqual({
      [AGENT]: getPermissions(true),
    });

    authorizer = new AllStaticReader(false);
    await expect(authorizer.handle({ credentials, identifier })).resolves.toEqual({
      [AGENT]: getPermissions(false),
    });
  });
});
