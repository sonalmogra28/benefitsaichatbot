import * as functions from "firebase-functions";
import type {DocumentData} from "firebase-admin/firestore";
import {adminDb, adminStorage} from "./firebase-admin";
import {vectorSearchService} from "./vector-search-service";

const BUCKET_NAME =
  process.env.GCLOUD_STORAGE_BUCKET || "your-default-bucket-name";

/**
 * Cleans up vectors, chunk documents, and storage files when a document is
 * deleted.
 */
export const cleanupDocumentOnDelete = functions.firestore
  .document("documents/{documentId}")
  .onDelete(async (snapshot, context) => {
    const documentId = context.params.documentId as string;
    const data = snapshot.data() as DocumentData;

    const companyId = data?.companyId as string | undefined;
    const storagePath = data?.storagePath as string | undefined;

    try {
      if (companyId) {
        const chunkSnap = await adminDb
          .collection("document_chunks")
          .where("companyId", "==", companyId)
          .where("metadata.documentId", "==", documentId)
          .get();

        const chunkIds = chunkSnap.docs.map((doc) => doc.id);

        if (chunkIds.length) {
          await vectorSearchService.removeDatapoints(chunkIds);

          for (let i = 0; i < chunkSnap.docs.length; i += 500) {
            const batch = adminDb.batch();
            const slice = chunkSnap.docs.slice(i, i + 500);
            slice.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
        }
      }

      if (storagePath) {
        await adminStorage
          .bucket(BUCKET_NAME)
          .file(storagePath)
          .delete({ignoreNotFound: true});
      }

      console.log(`Cleaned up resources for deleted document ${documentId}`);
    } catch (error) {
      console.error(
        `Failed to clean up resources for document ${documentId}:`,
        error,
      );
    }
  });
