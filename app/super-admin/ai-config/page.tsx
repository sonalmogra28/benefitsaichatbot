'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'; // Assuming form components exist

// Define the validation schema with Zod
const aiConfigSchema = z.object({
  personality: z
    .string()
    .min(10, 'Personality must be at least 10 characters.'),
  tone: z.enum(['formal', 'friendly', 'neutral', 'humorous']),
  // Example of a more complex field
  responseLength: z.number().min(50).max(500),
});

// Infer the TypeScript type from the schema
type AiConfigFormValues = z.infer<typeof aiConfigSchema>;

/**
 * Renders the AI Configuration page for the Super Admin.
 * This page contains the form to manage the AI's personality and tone.
 */
export default function AiConfigPage() {
  // We can add state for loading and feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<AiConfigFormValues>({
    resolver: zodResolver(aiConfigSchema),
    // Default values can be fetched from the API
    defaultValues: {
      personality: 'You are a helpful and friendly benefits assistant.',
      tone: 'friendly',
      responseLength: 250,
    },
  });

  // TODO: Fetch existing settings and populate the form
  useEffect(() => {
    // API call to get current settings
    // form.reset(fetchedSettings);
  }, [form]);

  const onSubmit = async (data: AiConfigFormValues) => {
    setIsLoading(true);
    setIsSuccess(false);
    console.log('Submitting AI config:', data);

    // TODO: Implement API call in the next task
    // await fetch('/api/super-admin/ai-config', { method: 'POST', body: JSON.stringify(data) });

    setTimeout(() => {
      // Simulate API latency
      setIsLoading(false);
      setIsSuccess(true);
    }, 1000);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Heading
        title="AI Configuration"
        description="Manage the chatbot's personality, tone, and response style."
      />
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="personality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personality</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Describe the AI&apos;s personality..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is the core instruction that defines the AI&apos;s
                      character.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The default tone of the AI&apos;s responses.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Configuration'}
              </Button>
              {isSuccess && (
                <p className="text-green-500">Settings saved successfully!</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
