// =================================================================
// RoasSiren™ (roassiren.com) - Support & Feedback Service
// Manages User Inquiries, Bug Reports, and Feature Suggestions
// =================================================================

import fs from 'fs';
import path from 'path';

export type TicketCategory = 'PROBLEM' | 'SUGGESTION' | 'SALES_INQUIRY' | 'GENERAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface SupportTicket {
  id: string;
  userContact: string; // Phone or Email or Name
  brandName?: string;
  category: TicketCategory;
  subject: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: TicketStatus;
  adminReply?: string;
  createdAt: string;
  resolvedAt?: string;
}

const STORAGE_PATH = path.resolve(process.cwd(), 'data', 'tickets.json');

// Initial seed tickets for demonstration
const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt_17890510001',
    userContact: '+91 98112 45890 (Aman - Snitch Media Buyer)',
    brandName: 'Snitch Clothing',
    category: 'PROBLEM',
    subject: 'Delayed siren alert on hero shirt variant',
    message: 'Hey, yesterday our linen shirt Size L sold out at 2:15 AM, but alert arrived around 2:25 AM. Can we make sweeps 5 minutes on our Growth plan?',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    adminReply: 'Configured your brand on our ultra-fast 5-minute radar sweep protocol. Sweep latency is now under 60 seconds.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
  },
  {
    id: 'tkt_17890510002',
    userContact: 'growth@mokobara.com',
    brandName: 'Mokobara Luggage',
    category: 'SUGGESTION',
    subject: 'Slack webhook integration for our agency channel',
    message: 'Can we get RoasSiren alerts posted directly into our #perf-marketing Slack channel alongside WhatsApp sirens?',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    adminReply: 'Slack and Discord webhook sirens are now live! You can configure your webhook URL in Dashboard settings.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
    resolvedAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
  },
  {
    id: 'tkt_17890510003',
    userContact: '+91 99201 88321 (Pooja - Minimalist Beauty)',
    brandName: 'Be Minimalist',
    category: 'SALES_INQUIRY',
    subject: 'Agency Fleet Plan for 15 D2C Brands',
    message: 'We are a performance marketing agency managing 15 beauty & personal care brands. What is the custom onboarding pricing for 150+ landing pages?',
    priority: 'HIGH',
    status: 'OPEN',
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  },
];

class SupportService {
  private tickets: SupportTicket[] = [];

  constructor() {
    this.loadTickets();
  }

  private loadTickets() {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
        this.tickets = JSON.parse(raw);
      } else {
        this.tickets = [...DEFAULT_TICKETS];
        this.persistTickets();
      }
    } catch {
      this.tickets = [...DEFAULT_TICKETS];
    }
  }

  private persistTickets() {
    try {
      const dir = path.dirname(STORAGE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STORAGE_PATH, JSON.stringify(this.tickets, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SupportService] Could not write tickets file:', err);
    }
  }

  getAllTickets(): SupportTicket[] {
    return this.tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getTicketById(id: string): SupportTicket | undefined {
    return this.tickets.find((t) => t.id === id);
  }

  createTicket(data: {
    userContact: string;
    brandName?: string;
    category: TicketCategory;
    subject: string;
    message: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): SupportTicket {
    const newTicket: SupportTicket = {
      id: `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userContact: data.userContact || 'Anonymous Founder',
      brandName: data.brandName || '',
      category: data.category || 'PROBLEM',
      subject: data.subject || 'Support Inquiry',
      message: data.message,
      priority: data.priority || (data.category === 'PROBLEM' ? 'HIGH' : 'MEDIUM'),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    this.tickets.unshift(newTicket);
    this.persistTickets();
    return newTicket;
  }

  updateTicketStatus(
    id: string,
    status: TicketStatus,
    adminReply?: string
  ): SupportTicket | null {
    const ticket = this.getTicketById(id);
    if (!ticket) return null;

    ticket.status = status;
    if (adminReply !== undefined) {
      ticket.adminReply = adminReply;
    }
    if (status === 'RESOLVED') {
      ticket.resolvedAt = new Date().toISOString();
    }

    this.persistTickets();
    return ticket;
  }

  deleteTicket(id: string): boolean {
    const initialLen = this.tickets.length;
    this.tickets = this.tickets.filter((t) => t.id !== id);
    if (this.tickets.length !== initialLen) {
      this.persistTickets();
      return true;
    }
    return false;
  }

  getStats() {
    const total = this.tickets.length;
    const open = this.tickets.filter((t) => t.status === 'OPEN').length;
    const inProgress = this.tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolved = this.tickets.filter((t) => t.status === 'RESOLVED').length;
    const problems = this.tickets.filter((t) => t.category === 'PROBLEM').length;
    const suggestions = this.tickets.filter((t) => t.category === 'SUGGESTION').length;

    return { total, open, inProgress, resolved, problems, suggestions };
  }
}

export const supportService = new SupportService();
