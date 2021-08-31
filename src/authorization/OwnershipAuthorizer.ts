import type { AccountSettings, AccountStore } from '../identity/interaction/email-password/storage/AccountStore';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Authorization } from './Authorization';
import type { AuthorizerArgs } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * Authorizer used to make sure that owners always will be able to change the permissions on data stored in their pod.
 */
export class OwnershipAuthorizer extends Authorizer {
  private readonly accountStore: AccountStore;

  public constructor(accountStore: AccountStore) {
    super();
    this.accountStore = accountStore;
  }

  public async canHandle({ credentials, identifier, permissions }: AuthorizerArgs): Promise<void> {
    if (Object.entries(permissions).some(([ name, value ]): boolean => value && name !== 'control')) {
      throw new NotImplementedHttpError('Only control permissions are supported.');
    }
    if (!credentials.webId) {
      throw new NotImplementedHttpError('Only authenticated requests are supported.');
    }
    let settings: AccountSettings;
    try {
      settings = await this.accountStore.getSettings(credentials.webId);
    } catch {
      throw new NotImplementedHttpError('Only requests by registered WebIDs are supported.');
    }
    if (!settings.podBaseUrl || !identifier.path.startsWith(settings.podBaseUrl)) {
      throw new NotImplementedHttpError('Only requests targeting the pod registered to this WebID are supported.');
    }
  }

  public async handle(): Promise<Authorization> {
    // If all checks in the canHandle function pass permission is always granted
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return { addMetadata(): void {} };
  }
}
