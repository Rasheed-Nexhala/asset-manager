import { saveCsvAndShare } from '../csvExport';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/docs/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

describe('csvExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCsvAndShare', () => {
    it('writes CSV and shares when document directory is available', async () => {
      const FileSystem = require('expo-file-system/legacy');
      const Sharing = require('expo-sharing');

      await saveCsvAndShare('col1,col2\nval1,val2', 'test-export');

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('test-export'),
        'col1,col2\nval1,val2',
        expect.any(Object)
      );
      expect(Sharing.shareAsync).toHaveBeenCalled();
    });

    it('uses default filename when not provided', async () => {
      const FileSystem = require('expo-file-system/legacy');

      await saveCsvAndShare('data');

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('export'),
        'data',
        expect.any(Object)
      );
    });
  });
});
