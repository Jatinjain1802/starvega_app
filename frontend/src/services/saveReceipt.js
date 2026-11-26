import { saveDocuments } from '@react-native-documents/picker';
import { v4 as uuid } from 'uuid';

export async function savePdfReceipt(base64) {
  const { Dirs, FileSystem } = require('react-native-file-access');
  const filename = 'receipt-' + uuid() + '.pdf';
  const path = Dirs.CacheDir + '/' + filename;
  try {
    await FileSystem.writeFile(path, base64, 'base64');
    const [saved] = await saveDocuments({
      sourceUris: ['file://' + path],
      fileName: 'rent-expense-receipt.pdf',
      mimeType: 'application/pdf',
      copy: true,
    });
    if (!saved || saved.error) throw Error('Receipt could not be saved');
  } finally {
    await FileSystem.unlink(path).catch(() => {});
  }
}
