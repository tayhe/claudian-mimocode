import * as fs from 'fs';
import * as path from 'path';

import { MimocodeCliResolver } from '@/providers/mimocode/runtime/MimocodeCliResolver';

jest.mock('fs');
jest.mock('@/utils/env', () => ({
  ...jest.requireActual('@/utils/env'),
  getHostnameKey: () => 'current-host',
}));

const mockedStat = fs.statSync as jest.Mock;

describe('MimocodeCliResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  it('uses the current host path instead of another synced host path', () => {
    mockedStat.mockImplementation((filePath: string) => {
      if (filePath === '/current/mimocode') {
        return { isFile: () => true };
      }
      throw new Error(`ENOENT: ${filePath}`);
    });

    const resolver = new MimocodeCliResolver();
    const resolved = resolver.resolve(
      {
        'other-host': '/other/mimocode',
        'current-host': '/current/mimocode',
      },
      '/legacy/mimocode',
      '',
    );

    expect(resolved).toBe('/current/mimocode');
  });

  it('falls back to the legacy path when the current host has no custom path', () => {
    mockedStat.mockImplementation((filePath: string) => {
      if (filePath === '/legacy/mimocode') {
        return { isFile: () => true };
      }
      throw new Error(`ENOENT: ${filePath}`);
    });

    const resolver = new MimocodeCliResolver();
    const resolved = resolver.resolve(
      {
        'other-host': '/other/mimocode',
      },
      '/legacy/mimocode',
      '',
    );

    expect(resolved).toBe('/legacy/mimocode');
  });

  it('returns null when neither the current host nor the legacy path resolve to a file', () => {
    mockedStat.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const resolver = new MimocodeCliResolver();
    const resolved = resolver.resolve(
      {
        'other-host': '/other/mimocode',
      },
      '/legacy/mimocode',
      '',
    );

    expect(resolved).toBeNull();
  });

  it('falls back to PATH lookup when no MimoCode CLI path is configured', () => {
    const pathDir = '/custom/bin';
    const pathBinary = path.join(pathDir, 'mimo');
    mockedStat.mockImplementation((filePath: string) => {
      if (filePath === pathBinary) {
        return { isFile: () => true };
      }
      throw new Error(`ENOENT: ${filePath}`);
    });

    const resolver = new MimocodeCliResolver();
    const resolved = resolver.resolve({}, '', `PATH=${pathDir}`);

    expect(resolved).toBe(pathBinary);
  });
});
