import { getLoggerFor } from '../logging/LogUtil';
import type { Credentials, CredentialSet } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';
import { AGENT } from './CredentialTypes';

/**
 * Credentials extractor that authenticates a constant agent
 * (useful for development or debugging purposes).
 */
export class UnsecureConstantCredentialsExtractor extends CredentialsExtractor {
  private readonly credentials: CredentialSet;
  private readonly logger = getLoggerFor(this);

  public constructor(agent: string);
  public constructor(agent: Credentials);
  public constructor(agent: string | Credentials) {
    super();
    this.credentials = { [AGENT]: typeof agent === 'string' ? { webId: agent } : agent };
  }

  public async handle(): Promise<CredentialSet> {
    this.logger.info(`Agent unsecurely claims to be ${this.credentials.agent!.webId}`);
    return this.credentials;
  }
}
