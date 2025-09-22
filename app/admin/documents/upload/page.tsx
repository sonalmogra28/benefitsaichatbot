import { DocumentUploadSimple } from '@/components/admin/document-upload-simple';

export default function DocumentUploadPage() {
  // For now, using a default company ID - in production this would come from user context
  const companyId = 'amerivet-demo'; // Replace with actual company ID logic

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground mt-2">
            Add benefits documents to the AI knowledge base for better responses.
          </p>
        </div>

        <DocumentUploadSimple companyId={companyId} />

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Document Types to Upload</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Benefits Information</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Benefits summary documents</li>
                <li>• Plan comparison charts</li>
                <li>• Coverage details</li>
                <li>• Cost information</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Policy Documents</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Employee handbooks</li>
                <li>• Policy manuals</li>
                <li>• Terms and conditions</li>
                <li>• Compliance documents</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Enrollment Guides</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Open enrollment guides</li>
                <li>• How-to documents</li>
                <li>• Step-by-step instructions</li>
                <li>• FAQ documents</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Support Resources</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Contact information</li>
                <li>• Provider directories</li>
                <li>• Claim forms</li>
                <li>• Help guides</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">How It Works</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</div>
              <div>
                <strong>Upload:</strong> Select your PDF document and choose the appropriate document type.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</div>
              <div>
                <strong>Process:</strong> The document is automatically processed and broken into searchable chunks.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</div>
              <div>
                <strong>Search:</strong> The AI can now answer questions using information from your uploaded documents.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
