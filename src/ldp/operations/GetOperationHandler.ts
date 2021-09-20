import type { PermissionMetadataWriter } from '../../authorization/metadata/PermissionMetadataWriter';
import type { ResourceStore } from '../../storage/ResourceStore';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { OkResponseDescription } from '../http/response/OkResponseDescription';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';

/**
 * Handles GET {@link Operation}s.
 * Calls the getRepresentation function from a {@link ResourceStore}.
 */
export class GetOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;
  private readonly metadataWriter: PermissionMetadataWriter;

  public constructor(store: ResourceStore, metadataWriter: PermissionMetadataWriter) {
    super();
    this.store = store;
    this.metadataWriter = metadataWriter;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'GET') {
      throw new NotImplementedHttpError('This handler only supports GET operations');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    const body = await this.store.getRepresentation(input.target, input.preferences, input.conditions);

    if (input.permissionSet) {
      await this.metadataWriter.handleSafe({ metadata: body.metadata, permissionSet: input.permissionSet });
    }

    return new OkResponseDescription(body.metadata, body.data);
  }
}
