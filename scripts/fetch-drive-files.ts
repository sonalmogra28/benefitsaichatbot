const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const fs = require('node:fs');
const path = require('node:path');

// Your service account key file path
const KEY_FILE_PATH = './service-account-key.json';

// The ID of the Google Drive folder you want to access
const FOLDER_ID = '1MCFdjfb_sx-4k2HiTgTtqYrYIJS-0LRi';

// The directory to save the downloaded files
const OUTPUT_DIR = path.resolve(__dirname, '../data/benefits-documents');

// Define the required scopes for Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

/**
 * Creates an authenticated JWT client
 * @returns {Promise<JWT>} An authenticated JWT client
 */
async function getAuthenticatedClient(): Promise<any> {
  // Changed to any to avoid TS errors with require
  const client = new JWT({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
  });
  await client.authorize();
  return client;
}

/**
 * Downloads a file from Google Drive.
 * @param {any} drive The Google Drive API client.
 * @param {string} fileId The ID of the file to download.
 * @param {string} fileName The name of the file to save as.
 */
async function downloadFile(drive: any, fileId: string, fileName: string) {
  const dest = fs.createWriteStream(path.join(OUTPUT_DIR, fileName));
  await drive.files
    .get({ fileId, alt: 'media' }, { responseType: 'stream' })
    .then((res: any) => {
      res.data
        .on('end', () => console.log(`Downloaded ${fileName}`))
        .on('error', (err: any) =>
          console.error(`Error downloading ${fileName}:`, err),
        )
        .pipe(dest);
    });
}

/**
 * Lists the files in the specified Google Drive folder and downloads them.
 */
async function syncFiles() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const client = await getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth: client });

    const res = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id, name, mimeType)',
      pageSize: 100, // Adjust as needed
    });

    const files = res.data.files;
    if (files && files.length > 0) {
      console.log('Starting file download...');
      for (const file of files) {
        if (file.id && file.name) {
          if (file.mimeType === 'application/vnd.google-apps.document') {
            // Handle Google Docs export to .docx
            const dest = fs.createWriteStream(
              path.join(OUTPUT_DIR, `${file.name}.docx`),
            );
            drive.files
              .export(
                {
                  fileId: file.id,
                  mimeType:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                },
                { responseType: 'stream' },
              )
              .then((res: any) => {
                res.data
                  .on('end', () => console.log(`Exported ${file.name}.docx`))
                  .on('error', (err: any) =>
                    console.error(`Error exporting ${file.name}:`, err),
                  )
                  .pipe(dest);
              });
          } else {
            await downloadFile(drive, file.id, file.name);
          }
        }
      }
    } else {
      console.log('No files found in the folder.');
    }
  } catch (error) {
    console.error('Error syncing files:', error);
  }
}

syncFiles();
