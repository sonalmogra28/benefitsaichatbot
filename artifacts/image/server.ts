import { createDocumentHandler } from '@/lib/artifacts/server';

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    // Image generation temporarily disabled for MVP
    const draftContent = '';
    
    dataStream.write({
      type: 'data-imageDelta',
      data: '',
      transient: true,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    // Image generation temporarily disabled for MVP
    const draftContent = '';
    
    dataStream.write({
      type: 'data-imageDelta',
      data: '',
      transient: true,
    });

    return draftContent;
  },
});
