import type { Readable } from 'stream';
import type { PermissionMetadataWriter } from '../../../../src/authorization/metadata/PermissionMetadataWriter';
import { HeadOperationHandler } from '../../../../src/ldp/operations/HeadOperationHandler';
import type { Operation } from '../../../../src/ldp/operations/Operation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { BasicConditions } from '../../../../src/storage/BasicConditions';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A HeadOperationHandler', (): void => {
  const conditions = new BasicConditions({});
  const preferences = {};
  let store: ResourceStore;
  let metadataWriter: jest.Mocked<PermissionMetadataWriter>;
  let handler: HeadOperationHandler;
  let data: Readable;

  beforeEach(async(): Promise<void> => {
    data = { destroy: jest.fn() } as any;
    store = {
      getRepresentation: jest.fn(async(): Promise<Representation> =>
        ({ binary: false, data, metadata: 'metadata' } as any)),
    } as any;

    metadataWriter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new HeadOperationHandler(store, metadataWriter);
  });

  it('only supports HEAD operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'HEAD' } as Operation)).resolves.toBeUndefined();
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(NotImplementedHttpError);
    await expect(handler.canHandle({ method: 'POST' } as Operation)).rejects.toThrow(NotImplementedHttpError);
  });

  it('returns the representation from the store with the correct response.', async(): Promise<void> => {
    const result = await handler.handle({ target: { path: 'url' }, preferences, conditions } as Operation);
    expect(result.statusCode).toBe(200);
    expect(result.metadata).toBe('metadata');
    expect(result.data).toBeUndefined();
    expect(data.destroy).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith({ path: 'url' }, preferences, conditions);
  });

  it('adds authorization metadata in case the operation is an AuthorizedOperation.', async(): Promise<void> => {
    const permissionSet = {};
    const result = await handler.handle(
      { target: { path: 'url' }, preferences, conditions, permissionSet } as Operation,
    );
    expect(result.statusCode).toBe(200);
    expect(store.getRepresentation).toHaveBeenCalledTimes(1);
    expect(store.getRepresentation).toHaveBeenLastCalledWith({ path: 'url' }, preferences, conditions);
    expect(metadataWriter.handleSafe).toHaveBeenCalledTimes(1);
    expect(metadataWriter.handleSafe).toHaveBeenLastCalledWith({ metadata: 'metadata', permissionSet });
  });
});
