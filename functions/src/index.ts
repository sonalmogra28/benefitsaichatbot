/**
 * This file is the main entry point for your Firebase Cloud Functions.
 *
 * It's responsible for exporting all the functions that you want to deploy.
 * The Firebase CLI will look for this file and deploy the functions it exports.
 *
 * We are keeping this file clean and organized by defining each function
 * in its own file within the `src` directory, and then exporting them from
 * here.
 */

// Export the document processing function
export {processDocumentOnUpload} from "./process-document";
// Export cleanup function for document deletions
export {cleanupDocumentOnDelete} from "./cleanup-document";
