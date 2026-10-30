/**
 * R2 Object Key formatters and parsers according to Mivra storage architecture.
 *
 * Pattern:
 * tenants/{tenantId}/messages/{messageId}/raw.eml
 * tenants/{tenantId}/messages/{messageId}/body.txt
 * tenants/{tenantId}/messages/{messageId}/body.html
 * tenants/{tenantId}/messages/{messageId}/attachments/{attachmentId}
 * tenants/{tenantId}/outbound/{sendJobId}/raw.eml
 */

export const StorageKeys = {
  rawMessage(tenantId: string, messageId: string): string {
    return `tenants/${tenantId}/messages/${messageId}/raw.eml`;
  },

  messageBodyText(tenantId: string, messageId: string): string {
    return `tenants/${tenantId}/messages/${messageId}/body.txt`;
  },

  messageBodyHtml(tenantId: string, messageId: string): string {
    return `tenants/${tenantId}/messages/${messageId}/body.html`;
  },

  attachment(tenantId: string, messageId: string, attachmentId: string): string {
    return `tenants/${tenantId}/messages/${messageId}/attachments/${attachmentId}`;
  },

  outboundRawMessage(tenantId: string, sendJobId: string): string {
    return `tenants/${tenantId}/outbound/${sendJobId}/raw.eml`;
  },

  parseKey(key: string): {
    tenantId: string;
    type: 'message' | 'outbound';
    id: string;
    part?: 'raw' | 'body.txt' | 'body.html' | 'attachment';
    attachmentId?: string;
  } | null {
    const messageMatch = key.match(/^tenants\/([^/]+)\/messages\/([^/]+)\/(raw\.eml|body\.txt|body\.html|attachments\/([^/]+))$/);
    if (messageMatch) {
      const tenantId = messageMatch[1];
      const id = messageMatch[2];
      const partStr = messageMatch[3];
      if (partStr.startsWith('attachments/')) {
        return {
          tenantId,
          type: 'message',
          id,
          part: 'attachment',
          attachmentId: messageMatch[4],
        };
      }
      return {
        tenantId,
        type: 'message',
        id,
        part: partStr === 'raw.eml' ? 'raw' : (partStr as 'body.txt' | 'body.html'),
      };
    }

    const outboundMatch = key.match(/^tenants\/([^/]+)\/outbound\/([^/]+)\/raw\.eml$/);
    if (outboundMatch) {
      return {
        tenantId: outboundMatch[1],
        type: 'outbound',
        id: outboundMatch[2],
        part: 'raw',
      };
    }

    return null;
  },
};
