import { AGENT, EVERYONE } from '../../../src/authentication/CredentialTypes';
import type { AuthorizerInput } from '../../../src/authorization/Authorizer';
import { PermissionBasedAuthorizer } from '../../../src/authorization/PermissionBasedAuthorizer';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { UnauthorizedHttpError } from '../../../src/util/errors/UnauthorizedHttpError';

describe('A PermissionBasedAuthorizer', (): void => {
  let input: AuthorizerInput;
  let authorizer: PermissionBasedAuthorizer;

  beforeEach(async(): Promise<void> => {
    input = {
      identifier: { path: 'http://test.com/foo' },
      permissions: {},
      permissionSet: {},
      credentials: {},
    };

    authorizer = new PermissionBasedAuthorizer();
  });

  it('can handle any input.', async(): Promise<void> => {
    await expect(authorizer.canHandle(input)).resolves.toBeUndefined();
  });

  it('allows access if the permissions are matched by the reader output.', async(): Promise<void> => {
    input.permissions = { read: true, write: true };
    input.permissionSet = {
      [EVERYONE]: { read: true, write: false },
      [AGENT]: { write: true },
    };
    await expect(authorizer.handle(input)).resolves.toBeUndefined();
  });

  it('throws an UnauthorizedHttpError when an unauthenticated request has no access.', async(): Promise<void> => {
    input.permissions = { read: true, write: true };
    input.permissionSet = {
      [EVERYONE]: { read: true, write: false },
    };
    await expect(authorizer.handle(input)).rejects.toThrow(UnauthorizedHttpError);
  });

  it('throws a ForbiddenHttpError when an authenticated request has no access.', async(): Promise<void> => {
    input.credentials = { agent: { webId: 'http://test.com/#me' }};
    input.permissions = { read: true, write: true };
    input.permissionSet = {
      [EVERYONE]: { read: true, write: false },
    };
    await expect(authorizer.handle(input)).rejects.toThrow(ForbiddenHttpError);
  });

  it('defaults to empty permissions for the Authorization.', async(): Promise<void> => {
    await expect(authorizer.handle(input)).resolves.toBeUndefined();
  });
});
