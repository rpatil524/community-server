import type { Credentials } from '../../../src/authentication/Credentials';
import { OwnershipAuthorizer } from '../../../src/authorization/OwnershipAuthorizer';
import type {
  AccountSettings,
  AccountStore,
} from '../../../src/identity/interaction/email-password/storage/AccountStore';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';

describe('An OwnershipAuthorizer', (): void => {
  const owner = 'http://test.com/alice/profile/card#me';
  const podBaseUrl = 'http://test.com/alice/';
  let credentials: Credentials;
  let identifier: ResourceIdentifier;
  let permissions: PermissionSet;
  let settings: AccountSettings;
  let accountStore: jest.Mocked<AccountStore>;
  let authorizer: OwnershipAuthorizer;

  beforeEach(async(): Promise<void> => {
    credentials = {};

    identifier = { path: 'http://test.com/random/location/' };

    permissions = {
      read: false,
      write: false,
      append: false,
      control: false,
    };

    settings = {
      useIdp: true,
      podBaseUrl,
    };

    accountStore = {
      getSettings: jest.fn(async(webId: string): Promise<AccountSettings> => {
        if (webId === owner) {
          return settings;
        }
        throw new Error('No account');
      }),
    } as any;

    authorizer = new OwnershipAuthorizer(accountStore);
  });

  it('only handles control permission requests.', async(): Promise<void> => {
    permissions.read = true;
    await expect(authorizer.canHandle({ credentials, identifier, permissions }))
      .rejects.toThrow('Only control permissions are supported.');
  });

  it('requires WebID credentials.', async(): Promise<void> => {
    permissions.control = true;
    await expect(authorizer.canHandle({ credentials, identifier, permissions }))
      .rejects.toThrow('Only authenticated requests are supported.');
  });

  it('requires the WebID to have an account.', async(): Promise<void> => {
    permissions.control = true;
    credentials.webId = 'http://test.com/someone/else';
    await expect(authorizer.canHandle({ credentials, identifier, permissions }))
      .rejects.toThrow('Only requests by registered WebIDs are supported.');
  });

  it('requires the registered account to have a pod.', async(): Promise<void> => {
    delete settings.podBaseUrl;
    permissions.control = true;
    credentials.webId = owner;
    await expect(authorizer.canHandle({ credentials, identifier, permissions }))
      .rejects.toThrow('Only requests targeting the pod registered to this WebID are supported.');
  });

  it('requires the target identifier to be part of the pod.', async(): Promise<void> => {
    permissions.control = true;
    credentials.webId = owner;
    await expect(authorizer.canHandle({ credentials, identifier, permissions }))
      .rejects.toThrow('Only requests targeting the pod registered to this WebID are supported.');
  });

  it('can handle all request passing the above checks.', async(): Promise<void> => {
    permissions.control = true;
    credentials.webId = owner;
    identifier.path = podBaseUrl;
    await expect(authorizer.canHandle({ credentials, identifier, permissions }))
      .resolves.toBeUndefined();
  });

  it('allows all requests that passed the canHandle checks.', async(): Promise<void> => {
    const prom = authorizer.handle();
    await expect(prom).resolves.toEqual(expect.objectContaining({ addMetadata: expect.any(Function) }));
    expect((await prom).addMetadata(null as any)).toBeUndefined();
  });
});
