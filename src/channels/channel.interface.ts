// =================================================================
// Keepr (usekeepr.com) - Omnichannel Gateway Abstraction
// Silicon Valley Standard Pluggable Messaging Layer
// =================================================================

export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'interactive';

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface InboundMessage {
  id: string;
  from: string; // Sanitized phone number (e.g. 919876543210)
  senderName: string;
  timestamp: string;
  type: MessageType;
  text?: string;
  mediaId?: string;
  mediaUrl?: string;
  caption?: string;
  mimeType?: string;
  fileName?: string;
  buttonId?: string;
}

export interface ChannelAdapter {
  name: string;
  sendTextMessage(to: string, text: string): Promise<boolean>;
  sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[],
    headerText?: string,
    footerText?: string
  ): Promise<boolean>;
  sendImage(to: string, buffer: Buffer, mimeType: string, caption?: string): Promise<boolean>;
  sendDocument(to: string, buffer: Buffer, mimeType: string, filename: string, caption?: string): Promise<boolean>;
  downloadMedia(mediaIdOrUrl: string): Promise<{ buffer: Buffer; mimeType: string }>;
}
