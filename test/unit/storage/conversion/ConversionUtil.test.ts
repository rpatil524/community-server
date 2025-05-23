import fetch, { Headers } from 'cross-fetch';
import * as fsExtra from 'fs-extra';
import type { ValuePreferences } from '../../../../src/http/representation/RepresentationPreferences';
import {
  cleanPreferences,
  ContextDocumentLoader,
  getBestPreference,
  getConversionTarget,
  getTypeWeight,
  getWeightedPreferences,
  isInternalContentType,
  matchesMediaPreferences,
  matchesMediaType,
  preferencesToString,
} from '../../../../src/storage/conversion/ConversionUtil';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';

jest.useFakeTimers();

// All of this is necessary to not break the cross-fetch imports that happen in `rdf-parse`
jest.mock('cross-fetch', (): any => {
  const mock = jest.fn();
  // Require the original module to not be mocked...
  const originalFetch = jest.requireActual('cross-fetch');
  return {
    __esModule: true,
    ...originalFetch,
    fetch: mock,
    default: mock,
  };
});

jest.mock('fs-extra', (): any => ({
  __esModule: true,
  ...jest.requireActual('fs-extra'),
}));

describe('ConversionUtil', (): void => {
  describe('ContextDocumentLoader', (): void => {
    const fetchMock: jest.Mock = fetch as any;
    const context1 = {
      '@context': {
        '@version': 1.1,
        test: 'http://example.com/context1#',
      },
    };
    const context2 = {
      '@context': {
        '@version': 1.1,
        test: 'http://example.com/context2#',
      },
    };
    const url = 'http://example.com/foo';

    function mockOnce(context: unknown): void {
      fetchMock.mockResolvedValueOnce({
        json: (): any => context,
        status: 200,
        ok: true,
        headers: new Headers({ 'content-type': 'application/ld+json' }),
      });
    }

    it('fetches the context URL.', async(): Promise<void> => {
      const loader = new ContextDocumentLoader({});

      mockOnce(context1);

      await expect(loader.load(url)).resolves.toEqual(context1);
    });

    it('returns the stored context if there is a match.', async(): Promise<void> => {
      const mock = jest.spyOn(fsExtra, 'readJsonSync');
      mock.mockReturnValueOnce(context2);

      const loader = new ContextDocumentLoader({ [url]: 'path' });

      mockOnce(context1);

      await expect(loader.load(url)).resolves.toEqual(context2);
    });

    it('caches fetched results for the given amount of time.', async(): Promise<void> => {
      const loader = new ContextDocumentLoader({}, 100);

      mockOnce(context1);
      mockOnce(context1);

      await expect(loader.load(url)).resolves.toEqual(context1);
      await expect(loader.load(url)).resolves.toEqual(context1);

      jest.advanceTimersByTime(100);

      await expect(loader.load(url)).resolves.toEqual(context1);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('#cleanPreferences', (): void => {
    it('supports all types for empty preferences.', async(): Promise<void> => {
      expect(cleanPreferences()).toEqual({ '*/*': 1, 'internal/*': 0 });
      expect(cleanPreferences({})).toEqual(expect.objectContaining({ '*/*': 1, 'internal/*': 0 }));
    });

    it('filters out internal types.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/a': 1 };
      expect(cleanPreferences(preferences)).toEqual({ 'a/a': 1, 'internal/*': 0 });
    });

    it('keeps internal types that are specifically requested.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/a': 1, 'internal/*': 0.5 };
      expect(cleanPreferences(preferences)).toEqual({ 'a/a': 1, 'internal/*': 0.5 });
    });
  });

  describe('#getTypeWeight', (): void => {
    it('returns the matching weight from the preferences.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/a': 0.8 };
      expect(getTypeWeight('a/a', preferences)).toBe(0.8);
    });

    it('returns the most specific weight.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/*': 0.5, '*/*': 0.8 };
      expect(getTypeWeight('a/a', preferences)).toBe(0.5);
    });

    it('returns 0 if no match is possible.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'b/*': 0.5, 'c/c': 0.8 };
      expect(getTypeWeight('a/a', preferences)).toBe(0);
    });

    it('errors on invalid types.', async(): Promise<void> => {
      expect((): any => getTypeWeight('unknown', {})).toThrow(InternalServerError);
      expect((): any => getTypeWeight('unknown', {})).toThrow('Unexpected media type: unknown.');
    });
  });

  describe('#getWeightedPreferences', (): void => {
    it('returns all weights in a sorted list.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'b/b': 1, 'c/c': 0.8 };
      const preferences: ValuePreferences = { 'a/*': 1, 'c/c': 0.8 };
      expect(getWeightedPreferences(types, preferences)).toEqual([
        { value: 'c/c', weight: 0.8 * 0.8 },
        { value: 'a/a', weight: 0.5 },
        { value: 'b/b', weight: 0 },
      ]);
    });
  });

  describe('#getBestPreference', (): void => {
    it('returns the best match.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'b/b': 1, 'c/c': 0.8 };
      const preferences: ValuePreferences = { 'a/*': 1, 'c/c': 0.8 };
      expect(getBestPreference(types, preferences)).toEqual({ value: 'c/c', weight: 0.8 * 0.8 });
    });

    it('returns undefined if there is no match.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'b/b': 1, 'c/c': 0.8 };
      const preferences: ValuePreferences = { 'd/*': 1, 'e/e': 0.8 };
      expect(getBestPreference(types, preferences)).toBeUndefined();
    });
  });

  describe('#getConversionTarget', (): void => {
    it('returns the best match.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'b/b': 1, 'c/c': 0.8 };
      const preferences: ValuePreferences = { 'a/*': 1, 'c/c': 0.8 };
      expect(getConversionTarget(types, preferences)).toBe('c/c');
    });

    it('matches anything if there are no preferences.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'b/b': 1, 'c/c': 0.8 };
      expect(getConversionTarget(types)).toBe('b/b');
    });

    it('returns undefined if there is no match.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'b/b': 1, 'c/c': 0.8 };
      const preferences: ValuePreferences = { 'd/*': 1, 'e/e': 0.8 };
      expect(getConversionTarget(types, preferences)).toBeUndefined();
    });

    it('does not match internal types if not in the preferences.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'internal/b': 1, 'c/c': 0.8 };
      expect(getConversionTarget(types)).toBe('c/c');
    });

    it('matches internal types if they are specifically requested.', async(): Promise<void> => {
      const types: ValuePreferences = { 'a/a': 0.5, 'internal/b': 1, 'c/c': 0.8 };
      const preferences: ValuePreferences = { 'a/*': 1, 'internal/b': 1, 'c/c': 0.8 };
      expect(getConversionTarget(types, preferences)).toBe('internal/b');
    });
  });

  describe('#matchesMediaPreferences', (): void => {
    it('returns false if there are no matches.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/x': 1, 'b/x': 0.5, 'c/x': 0 };
      expect(matchesMediaPreferences('c/x', preferences)).toBe(false);
    });

    it('returns true if there are matches.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/x': 1, 'b/x': 0.5, 'c/x': 0 };
      expect(matchesMediaPreferences('b/x', preferences)).toBe(true);
    });

    it('matches anything if there are no preferences.', async(): Promise<void> => {
      expect(matchesMediaPreferences('a/a')).toBe(true);
    });

    it('does not match internal types if not in the preferences.', async(): Promise<void> => {
      expect(matchesMediaPreferences('internal/b')).toBe(false);
    });

    it('matches internal types if they are specifically requested.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/*': 1, 'internal/b': 1, 'c/c': 0.8 };
      expect(matchesMediaPreferences('internal/b', preferences)).toBe(true);
    });
  });

  describe('#matchesMediaType', (): void => {
    it('matches all possible media types.', async(): Promise<void> => {
      expect(matchesMediaType('*/*', 'text/turtle')).toBeTruthy();
      expect(matchesMediaType('text/*', '*/*')).toBeTruthy();
      expect(matchesMediaType('text/*', 'text/turtle')).toBeTruthy();
      expect(matchesMediaType('text/plain', 'text/*')).toBeTruthy();
      expect(matchesMediaType('text/turtle', 'text/turtle')).toBeTruthy();

      expect(matchesMediaType('text/*', 'application/*')).toBeFalsy();
      expect(matchesMediaType('text/plain', 'application/*')).toBeFalsy();
      expect(matchesMediaType('text/plain', 'text/turtle')).toBeFalsy();
    });
  });

  describe('#isInternalContentType', (): void => {
    it('only returns true on internal types.', async(): Promise<void> => {
      expect(isInternalContentType('internal/quads')).toBeTruthy();

      expect(isInternalContentType()).toBeFalsy();
      expect(isInternalContentType('text/turtle')).toBeFalsy();
    });
  });

  describe('#preferencesToString', (): void => {
    it('returns a string serialization.', async(): Promise<void> => {
      const preferences: ValuePreferences = { 'a/*': 1, 'b/b': 0.8, 'c/c': 0 };
      expect(preferencesToString(preferences)).toBe('a/*:1,b/b:0.8,c/c:0');
    });
  });
});
