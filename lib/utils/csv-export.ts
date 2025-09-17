/**
 * CSV Export Utilities
 * Handles conversion of data to CSV format
 */

export interface CSVExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
}

export class CSVExporter {
  /**
   * Convert an array of objects to CSV format
   */
  static arrayToCSV<T extends Record<string, any>>(
    data: T[],
    options: CSVExportOptions = {}
  ): string {
    const {
      includeHeaders = true,
      delimiter = ','
    } = options;

    if (data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects
    const allKeys = Array.from(
      new Set(data.flatMap(obj => Object.keys(obj)))
    );

    // Create CSV rows
    const rows: string[] = [];

    // Add headers if requested
    if (includeHeaders) {
      rows.push(this.escapeRow(allKeys, delimiter));
    }

    // Add data rows
    for (const item of data) {
      const values = allKeys.map(key => item[key] ?? '');
      rows.push(this.escapeRow(values, delimiter));
    }

    return rows.join('\n');
  }

  /**
   * Convert nested analytics data to CSV format
   */
  static analyticsToCSV(analyticsData: any): string {
    const rows: string[] = [];
    
    // Add metadata
    rows.push('Analytics Export');
    rows.push(`Exported At,${analyticsData.exportedAt}`);
    rows.push(`Company ID,${analyticsData.companyId}`);
    rows.push('');
    
    // Chat Analytics
    if (analyticsData.analytics?.chat) {
      rows.push('Chat Analytics');
      rows.push('Metric,Value');
      const chat = analyticsData.analytics.chat;
      rows.push(`Total Chats,${chat.totalChats || 0}`);
      rows.push(`Average Messages per Chat,${chat.averageMessagesPerChat || 0}`);
      rows.push(`Total Questions,${chat.totalQuestions || 0}`);
      rows.push('');
      
      // Top Questions
      if (chat.topQuestions && chat.topQuestions.length > 0) {
        rows.push('Top Questions');
        rows.push('Question,Count,Percentage');
        chat.topQuestions.forEach((q: any) => {
          rows.push(`"${q.question || ''}",${q.count || 0},${q.percentage || 0}%`);
        });
        rows.push('');
      }
    }
    
    // Company Analytics
    if (analyticsData.analytics?.company) {
      rows.push('Company Analytics');
      rows.push('Metric,Value');
      const company = analyticsData.analytics.company;
      rows.push(`Total Users,${company.totalUsers || 0}`);
      rows.push(`Active Users,${company.activeUsers || 0}`);
      rows.push(`Total Documents,${company.totalDocuments || 0}`);
      rows.push(`Storage Used (MB),${company.storageUsed || 0}`);
      rows.push('');
    }
    
    // User Activity
    if (analyticsData.analytics?.users && analyticsData.analytics.users.length > 0) {
      rows.push('User Activity');
      rows.push('User ID,Email,Last Active,Total Chats,Total Messages');
      analyticsData.analytics.users.forEach((user: any) => {
        rows.push(`"${user.id || ''}","${user.email || ''}","${user.lastActive || ''}",${user.totalChats || 0},${user.totalMessages || 0}`);
      });
    }
    
    return rows.join('\n');
  }

  /**
   * Escape a row of values for CSV format
   */
  private static escapeRow(values: any[], delimiter: string): string {
    return values.map(value => {
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      
      // If the value contains the delimiter, quotes, or newlines, wrap in quotes
      if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(delimiter);
  }

  /**
   * Create a downloadable CSV file
   */
  static createDownloadableCSV(
    csvContent: string,
    filename: string = 'export.csv'
  ): { content: string; headers: Record<string, string> } {
    return {
      content: csvContent,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
  }

  /**
   * Convert chat messages to CSV format
   */
  static chatMessagesToCSV(messages: any[]): string {
    if (messages.length === 0) {
      return 'No messages found';
    }

    const rows: string[] = [];
    rows.push('Timestamp,User ID,Message Type,Content,Tokens Used');
    
    messages.forEach(message => {
      rows.push([
        message.timestamp || '',
        message.userId || '',
        message.type || 'user',
        `"${(message.content || '').replace(/"/g, '""')}"`,
        message.tokensUsed || 0
      ].join(','));
    });
    
    return rows.join('\n');
  }

  /**
   * Convert user activity to CSV format
   */
  static userActivityToCSV(users: any[]): string {
    if (users.length === 0) {
      return 'No users found';
    }

    const rows: string[] = [];
    rows.push('User ID,Email,Display Name,Role,Last Active,Total Chats,Total Messages,Status');
    
    users.forEach(user => {
      rows.push([
        user.id || '',
        `"${(user.email || '').replace(/"/g, '""')}"`,
        `"${(user.displayName || '').replace(/"/g, '""')}"`,
        user.role || '',
        user.lastActive || '',
        user.totalChats || 0,
        user.totalMessages || 0,
        user.status || 'active'
      ].join(','));
    });
    
    return rows.join('\n');
  }
}
