import { ResourceStore } from '../../storage/ResourceStore';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { Operation } from './Operation';
import { OperationHandler } from './OperationHandler';
import { ResponseDescription } from './ResponseDescription';

/**
 * Handles DELETE {@link Operation}s.
 * Calls the deleteResource function from a {@link ResourceStore}.
 */
export class SimpleDeleteOperationHandler extends OperationHandler {
  private readonly store: ResourceStore;

  public constructor(store: ResourceStore) {
    super();
    this.store = store;
  }

  public async canHandle(input: Operation): Promise<void> {
    if (input.method !== 'DELETE') {
      throw new UnsupportedHttpError('This handler only supports DELETE operations.');
    }
  }

  public async handle(input: Operation): Promise<ResponseDescription> {
    await this.store.deleteResource(input.target);
    return { identifier: input.target };
  }
}