import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, Circle, FileText, BarChart3, MessageSquare, Settings } from 'lucide-react';

export default async function TestImplementationPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/sign-in');
  }

  const implementationChecklist = [
    {
      category: 'Authentication & Database',
      icon: <Settings className="h-5 w-5" />,
      items: [
        { name: 'Stack Auth + Neon Auth sync', status: 'completed', path: '/sign-in' },
        { name: 'Multi-tenant database schema', status: 'completed', path: null },
        { name: 'User roles (Admin, HR, Employee)', status: 'completed', path: null },
      ]
    },
    {
      category: 'Document Management',
      icon: <FileText className="h-5 w-5" />,
      items: [
        { name: 'Document upload UI', status: 'completed', path: '/admin/documents' },
        { name: 'Document list with filters', status: 'completed', path: '/admin/documents' },
        { name: 'PDF processing pipeline', status: 'completed', path: null },
        { name: 'Vector embeddings (Pinecone)', status: 'completed', path: null },
      ]
    },
    {
      category: 'Chat System',
      icon: <MessageSquare className="h-5 w-5" />,
      items: [
        { name: 'Chat interface', status: 'completed', path: '/chat' },
        { name: 'Streaming responses', status: 'completed', path: '/chat' },
        { name: 'Benefits-specific tools', status: 'completed', path: '/chat' },
        { name: 'Conversation persistence', status: 'completed', path: null },
        { name: 'RAG integration', status: 'completed', path: null },
      ]
    },
    {
      category: 'Analytics & Monitoring',
      icon: <BarChart3 className="h-5 w-5" />,
      items: [
        { name: 'Analytics dashboard', status: 'completed', path: '/admin/analytics' },
        { name: 'Chat event tracking', status: 'completed', path: null },
        { name: 'Cost tracking', status: 'completed', path: '/admin/analytics' },
        { name: 'Usage metrics', status: 'completed', path: '/admin/analytics' },
      ]
    },
  ];

  const totalItems = implementationChecklist.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedItems = implementationChecklist.reduce(
    (acc, cat) => acc + cat.items.filter(item => item.status === 'completed').length, 
    0
  );
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Implementation Status</h1>
        <p className="text-muted-foreground mt-2">
          Phase 2 MVP Implementation Progress
        </p>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            {completedItems} of {totalItems} features implemented
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Checklist */}
      {implementationChecklist.map((category, categoryIndex) => (
        <Card key={categoryIndex}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {category.icon}
              {category.category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {category.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={item.status === 'completed' ? '' : 'text-muted-foreground'}>
                      {item.name}
                    </span>
                  </div>
                  {item.path && (
                    <Link href={item.path}>
                      <Button variant="outline" size="sm">
                        Test →
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Actions</CardTitle>
          <CardDescription>
            Test the key features of the implementation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/chat">
              <Button className="w-full" variant="default">
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Chat Interface
              </Button>
            </Link>
            <Link href="/admin/documents">
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Manage Documents
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button className="w-full" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </Link>
            <Link href="/admin">
              <Button className="w-full" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Admin Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>
            Required environment variables for production
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Database (Neon PostgreSQL)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Authentication (Stack Auth)</span>
            </div>
            <div className="flex items-center gap-2">
              {process.env.OPENAI_API_KEY ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-red-600" />
              )}
              <span>OpenAI API Key</span>
            </div>
            <div className="flex items-center gap-2">
              {process.env.PINECONE_API_KEY ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-red-600" />
              )}
              <span>Pinecone Vector Database</span>
            </div>
            <div className="flex items-center gap-2">
              {process.env.BLOB_READ_WRITE_TOKEN ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-yellow-600" />
              )}
              <span>Blob Storage (Optional)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            To complete the Phase 2 MVP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Configure all environment variables in .env.local</li>
            <li>Create Pinecone index named 'benefits-ai' with 1536 dimensions</li>
            <li>Run database migrations: <code className="bg-gray-100 px-2 py-1 rounded">npm run db:push</code></li>
            <li>Upload test documents through the admin interface</li>
            <li>Test the chat interface with benefits questions</li>
            <li>Monitor analytics to verify tracking is working</li>
            <li>Deploy to Vercel with all environment variables</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}