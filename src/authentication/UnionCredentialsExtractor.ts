import { UnionHandler } from '../util/handlers/UnionHandler';
import type { Credentials, CredentialSet } from './Credentials';
import type { CredentialsExtractor } from './CredentialsExtractor';
import type { ALL_CREDENTIALS } from './CredentialTypes';

/**
 * Combines the results of several CredentialsExtractors into one.
 * If multiple of these extractors return a value for the same key,
 * the last result will be used.
 */
export class UnionCredentialsExtractor extends UnionHandler<CredentialsExtractor> {
  public constructor(extractors: CredentialsExtractor[]) {
    super(extractors);
  }

  public async combine(results: CredentialSet[]): Promise<CredentialSet> {
    // Combine all the results into a single object
    return results.reduce((result, credential): CredentialSet => {
      for (const [ key, value ] of Object.entries(credential) as [ ALL_CREDENTIALS, Credentials ][]) {
        if (value) {
          result[key] = value;
        }
      }
      return result;
    }, {});
  }
}
