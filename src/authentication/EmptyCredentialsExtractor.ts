import type { HttpRequest } from '../server/HttpRequest';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { CredentialSet } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';
import { EVERYONE } from './CredentialTypes';

/**
 * Extracts the empty credentials, indicating an unauthenticated agent.
 */
export class EmptyCredentialsExtractor extends CredentialsExtractor {
  public async canHandle({ headers }: HttpRequest): Promise<void> {
    const { authorization } = headers;
    if (authorization) {
      throw new NotImplementedHttpError('Unexpected Authorization scheme.');
    }
  }

  public async handle(): Promise<CredentialSet> {
    return { [EVERYONE]: {}};
  }
}
