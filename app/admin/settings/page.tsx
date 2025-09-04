'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Bell, Database, Zap, Globe, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export default function AdminSettingsPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [settings, setSettings] = useState({
    platform: {
      name: 'Benefits Assistant Chatbot',
      url: 'https://benefits.example.com',
      supportEmail: 'support@benefits.example.com',
      maxFileSize: 10,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'png', 'jpg']
    },
    security: {
      mfaRequired: false,
      sessionTimeout: 30,
      passwordMinLength: 8,
      passwordRequireSpecial: true,
      maxLoginAttempts: 5
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      newUserNotification: true,
      systemAlerts: true,
      weeklyReports: false
    },
    ai: {
      provider: 'vertex-ai',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxTokens: 2048,
      streamingEnabled: true
    },
    storage: {
      provider: 'firebase',
      maxStoragePerCompany: 10,
      autoDeleteAfter: 90,
      compressionEnabled: true
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        if (!idTokenResult.claims.platform_admin && !idTokenResult.claims.super_admin) {
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  const handleSave = async (section: string) => {
    console.log(`Saving ${section} settings:`, settings);
    // TODO: Implement save functionality
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure platform-wide settings and preferences</p>
      </div>

      <Tabs defaultValue="platform" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="platform">
            <Globe className="mr-2 size-4" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 size-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Zap className="mr-2 size-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="storage">
            <Database className="mr-2 size-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
              <CardDescription>General platform settings and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input 
                  id="platform-name" 
                  value={settings.platform.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, name: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform-url">Platform URL</Label>
                <Input 
                  id="platform-url" 
                  value={settings.platform.url}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, url: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input 
                  id="support-email" 
                  type="email"
                  value={settings.platform.supportEmail}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, supportEmail: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                <Input 
                  id="max-file-size" 
                  type="number"
                  value={settings.platform.maxFileSize}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, maxFileSize: Number.parseInt(e.target.value) }
                  })}
                />
              </div>
              <Button onClick={() => handleSave('platform')}>
                <Save className="mr-2 size-4" />
                Save Platform Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure authentication and security policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require MFA for all users</Label>
                  <p className="text-sm text-muted-foreground">
                    Enforce multi-factor authentication
                  </p>
                </div>
                <Checkbox 
                  checked={settings.security.mfaRequired}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    security: { ...settings.security, mfaRequired: checked === true }
                  })}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input 
                  id="session-timeout" 
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, sessionTimeout: Number.parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-length">Minimum Password Length</Label>
                <Input 
                  id="password-length" 
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, passwordMinLength: Number.parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require special characters in password</Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must include special characters
                  </p>
                </div>
                <Checkbox 
                  checked={settings.security.passwordRequireSpecial}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    security: { ...settings.security, passwordRequireSpecial: checked === true }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-attempts">Max Login Attempts</Label>
                <Input 
                  id="max-attempts" 
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, maxLoginAttempts: Number.parseInt(e.target.value) }
                  })}
                />
              </div>
              <Button onClick={() => handleSave('security')}>
                <Save className="mr-2 size-4" />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how the platform sends notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via email
                  </p>
                </div>
                <Checkbox 
                  checked={settings.notifications.emailEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailEnabled: checked === true }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via SMS
                  </p>
                </div>
                <Checkbox 
                  checked={settings.notifications.smsEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, smsEnabled: checked === true }
                  })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New User Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify admins when new users register
                  </p>
                </div>
                <Checkbox 
                  checked={settings.notifications.newUserNotification}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, newUserNotification: checked === true }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send critical system alerts to admins
                  </p>
                </div>
                <Checkbox 
                  checked={settings.notifications.systemAlerts}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, systemAlerts: checked === true }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Send weekly usage reports to admins
                  </p>
                </div>
                <Checkbox 
                  checked={settings.notifications.weeklyReports}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, weeklyReports: checked === true }
                  })}
                />
              </div>
              <Button onClick={() => handleSave('notifications')}>
                <Save className="mr-2 size-4" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Configure AI model and behavior settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-provider">AI Provider</Label>
                <select 
                  id="ai-provider"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settings.ai.provider}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, provider: e.target.value }
                  })}
                >
                  <option value="vertex-ai">Vertex AI (Google)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-model">Model</Label>
                <Input 
                  id="ai-model" 
                  value={settings.ai.model}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, model: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (0-1)</Label>
                <Input 
                  id="temperature" 
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.ai.temperature}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, temperature: Number.parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input 
                  id="max-tokens" 
                  type="number"
                  value={settings.ai.maxTokens}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, maxTokens: Number.parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Streaming</Label>
                  <p className="text-sm text-muted-foreground">
                    Stream AI responses in real-time
                  </p>
                </div>
                <Checkbox 
                  checked={settings.ai.streamingEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, streamingEnabled: checked === true }
                  })}
                />
              </div>
              <Button onClick={() => handleSave('ai')}>
                <Save className="mr-2 size-4" />
                Save AI Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>Storage Configuration</CardTitle>
              <CardDescription>Configure document storage and retention policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storage-provider">Storage Provider</Label>
                <select 
                  id="storage-provider"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settings.storage.provider}
                  onChange={(e) => setSettings({
                    ...settings,
                    storage: { ...settings.storage, provider: e.target.value }
                  })}
                >
                  <option value="firebase">Firebase Storage</option>
                  <option value="gcs">Google Cloud Storage</option>
                  <option value="s3">Amazon S3</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-storage">Max Storage per Company (GB)</Label>
                <Input 
                  id="max-storage" 
                  type="number"
                  value={settings.storage.maxStoragePerCompany}
                  onChange={(e) => setSettings({
                    ...settings,
                    storage: { ...settings.storage, maxStoragePerCompany: Number.parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto-delete">Auto-delete after (days)</Label>
                <Input 
                  id="auto-delete" 
                  type="number"
                  value={settings.storage.autoDeleteAfter}
                  onChange={(e) => setSettings({
                    ...settings,
                    storage: { ...settings.storage, autoDeleteAfter: Number.parseInt(e.target.value) }
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Set to 0 to disable auto-deletion
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Compression</Label>
                  <p className="text-sm text-muted-foreground">
                    Compress files to save storage space
                  </p>
                </div>
                <Checkbox 
                  checked={settings.storage.compressionEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    storage: { ...settings.storage, compressionEnabled: checked === true }
                  })}
                />
              </div>
              <Button onClick={() => handleSave('storage')}>
                <Save className="mr-2 size-4" />
                Save Storage Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}