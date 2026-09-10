// =================================================================
// RoasSiren (roassiren.com) - Core Watchdog Inspection Engine
// High-Speed Shopify Stock & Broken Link Auditor for Meta Ads
// =================================================================

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { WATCHDOG_RULES } from '../config/constants.js';

export type DiagnosticStatus = 
  | 'SAFE_IN_STOCK'
  | 'CRITICAL_OUT_OF_STOCK'
  | 'PARTIAL_OUT_OF_STOCK'
  | 'DEAD_LINK_404'
  | 'REDIRECT_RISK'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface VariantDetail {
  id: string | number;
  title: string;
  available: boolean;
  price: number;
  sku?: string;
}

export interface DiagnosticResult {
  url: string;
  domain: string;
  brandName: string;
  handle?: string;
  httpStatus: number;
  status: DiagnosticStatus;
  isAvailable: boolean;
  productTitle: string;
  productImage?: string;
  price?: number;
  currency: string;
  totalVariants: number;
  inStockVariants: number;
  outOfStockVariants: number;
  variants: VariantDetail[];
  adWasteRisk: {
    level: 'CRITICAL' | 'HIGH' | 'LOW' | 'SAFE';
    estimatedDailySpend: number;
    hourlyBurnRateInr: number;
    estimatedWastePct: number;
    actionHeadline: string;
    actionAdvice: string;
  };
  scannedAt: string;
  responseTimeMs: number;
}

export interface MonitoredUrl {
  id: string;
  url: string;
  brandName: string;
  userPhone: string;
  dailyAdSpend: number;
  lastStatus: DiagnosticStatus;
  lastCheckedAt: string;
  lastSirenSentAt?: string;
  consecutiveFailures: number;
  isActive: boolean;
  createdAt: string;
  webhookUrl?: string;
  alertRecipients?: string[];
}

export class WatchdogService {
  private monitoredUrls: Map<string, MonitoredUrl> = new Map();
  private storageFilePath: string = path.join(process.cwd(), 'vault', 'monitored_urls.json');

  constructor() {
    this.loadPersistedUrls();
    console.log(`🛡️ RoasSiren Watchdog Engine initialized with ${this.monitoredUrls.size} persistent watchdogs.`);
  }

  private loadPersistedUrls(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const data: MonitoredUrl[] = JSON.parse(raw);
        data.forEach((item) => this.monitoredUrls.set(item.id, item));
      }
    } catch (err) {
      console.warn('[Watchdog] Could not load persisted watchdogs:', err);
    }
  }

  private savePersistedUrls(): void {
    try {
      const data = Array.from(this.monitoredUrls.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[Watchdog] Failed to save watchdogs to file:', err);
    }
  }

  /**
   * Parse Shopify domain and product handle from any URL
   */
  public parseShopifyUrl(rawUrl: string): { domain: string; handle?: string; cleanUrl: string } {
    try {
      let normalized = rawUrl.trim();
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = 'https://' + normalized;
      }

      const parsed = new URL(normalized);
      const domain = parsed.hostname;
      const pathname = parsed.pathname;

      // Extract handle from /products/:handle or /collections/.../products/:handle
      const match = pathname.match(/\/products\/([^\/\?#]+)/i);
      const handle = match ? match[1] : undefined;

      return {
        domain,
        handle,
        cleanUrl: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
      };
    } catch (err) {
      return { domain: rawUrl, cleanUrl: rawUrl };
    }
  }

  /**
   * Execute full diagnostic scan on any Shopify product or landing page URL
   */
  public async scanUrl(targetUrl: string, dailyAdSpend: number = WATCHDOG_RULES.DEFAULT_ESTIMATED_DAILY_BUDGET): Promise<DiagnosticResult> {
    const startTime = Date.now();
    const { domain, handle, cleanUrl } = this.parseShopifyUrl(targetUrl);
    const scannedAt = new Date().toISOString();

    const baseResult: DiagnosticResult = {
      url: targetUrl,
      domain,
      brandName: this.extractBrandFromDomain(domain),
      handle,
      httpStatus: 0,
      status: 'UNKNOWN',
      isAvailable: false,
      productTitle: 'Unknown Product',
      currency: 'INR',
      totalVariants: 0,
      inStockVariants: 0,
      outOfStockVariants: 0,
      variants: [],
      adWasteRisk: {
        level: 'LOW',
        estimatedDailySpend: dailyAdSpend,
        hourlyBurnRateInr: Math.round(dailyAdSpend / 24),
        estimatedWastePct: 0,
        actionHeadline: 'Scan in progress',
        actionAdvice: 'Verifying destination status.',
      },
      scannedAt,
      responseTimeMs: 0,
    };

    // 1. If we have a Shopify product handle, check native Shopify endpoint: https://domain/products/handle.js
    if (handle) {
      try {
        const jsonEndpoint = `https://${domain}/products/${handle}.js`;
        const resp = await axios.get(jsonEndpoint, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
          },
          validateStatus: () => true, // Don't throw on 404/redirects so we can inspect status
        });

        baseResult.httpStatus = resp.status;

        if (resp.status === 200 && resp.data && typeof resp.data === 'object' && resp.data.title) {
          return this.parseShopifyJson(resp.data, baseResult, dailyAdSpend, startTime);
        }

        if (resp.status === 404) {
          baseResult.status = 'DEAD_LINK_404';
          baseResult.isAvailable = false;
          baseResult.adWasteRisk = {
            level: 'CRITICAL',
            estimatedDailySpend: dailyAdSpend,
            hourlyBurnRateInr: Math.round(dailyAdSpend / 24),
            estimatedWastePct: 100,
            actionHeadline: '🚨 DEAD AD DESTINATION (404 NOT FOUND)',
            actionAdvice: 'Pause ad immediately! The target product was deleted or renamed on Shopify. Every ad click is hitting a broken 404 page.',
          };
          baseResult.responseTimeMs = Date.now() - startTime;
          return baseResult;
        }
      } catch (err: any) {
        console.warn(`[Watchdog] Native JSON check failed for ${targetUrl}: ${err.message}. Falling back to HTML inspection.`);
      }
    }

    // 2. HTML Fallback Inspection (for non-standard URLs, collections, or headless setups)
    try {
      const htmlResp = await axios.get(targetUrl, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        validateStatus: () => true,
      });

      baseResult.httpStatus = htmlResp.status;

      if (htmlResp.status === 404) {
        baseResult.status = 'DEAD_LINK_404';
        baseResult.isAvailable = false;
        baseResult.adWasteRisk = {
          level: 'CRITICAL',
          estimatedDailySpend: dailyAdSpend,
          hourlyBurnRateInr: Math.round(dailyAdSpend / 24),
          estimatedWastePct: 100,
          actionHeadline: '🚨 DEAD AD DESTINATION (404 NOT FOUND)',
          actionAdvice: 'Pause ad immediately! Destination page returns 404 Not Found.',
        };
        baseResult.responseTimeMs = Date.now() - startTime;
        return baseResult;
      }

      if (htmlResp.status >= 500) {
        baseResult.status = 'SERVER_ERROR';
        baseResult.isAvailable = false;
        baseResult.adWasteRisk = {
          level: 'CRITICAL',
          estimatedDailySpend: dailyAdSpend,
          hourlyBurnRateInr: Math.round(dailyAdSpend / 24),
          estimatedWastePct: 100,
          actionHeadline: '🚨 SERVER CRASH (5XX ERROR)',
          actionAdvice: 'Shopify store or host is returning server errors. Check store uptime.',
        };
        baseResult.responseTimeMs = Date.now() - startTime;
        return baseResult;
      }

      return this.parseHtmlFallback(htmlResp.data, baseResult, dailyAdSpend, startTime);
    } catch (err: any) {
      baseResult.httpStatus = 500;
      baseResult.status = 'SERVER_ERROR';
      baseResult.isAvailable = false;
      baseResult.productTitle = 'Unreachable URL';
      baseResult.adWasteRisk = {
        level: 'CRITICAL',
        estimatedDailySpend: dailyAdSpend,
        hourlyBurnRateInr: Math.round(dailyAdSpend / 24),
        estimatedWastePct: 100,
        actionHeadline: '🚨 CONNECTION TIMEOUT / FAILED',
        actionAdvice: `Unable to connect to destination: ${err.message}. Inspect domain DNS and SSL.`,
      };
      baseResult.responseTimeMs = Date.now() - startTime;
      return baseResult;
    }
  }

  /**
   * Parse structured Shopify JSON from /products/{handle}.js
   */
  private parseShopifyJson(
    data: any,
    base: DiagnosticResult,
    dailyAdSpend: number,
    startTime: number
  ): DiagnosticResult {
    base.productTitle = data.title || 'Shopify Product';
    base.productImage = data.featured_image || (data.images && data.images[0]) || undefined;

    // Normalizing price: Shopify price in .js is in cents (e.g. 149900 -> 1499)
    if (data.price) {
      base.price = data.price > 10000 ? Math.round(data.price / 100) : data.price;
    }

    const rawVariants: any[] = Array.isArray(data.variants) ? data.variants : [];
    base.totalVariants = rawVariants.length;

    const variants: VariantDetail[] = rawVariants.map((v) => ({
      id: v.id,
      title: v.title || 'Default',
      available: Boolean(v.available),
      price: v.price > 10000 ? Math.round(v.price / 100) : v.price,
      sku: v.sku || undefined,
    }));

    base.variants = variants;
    base.inStockVariants = variants.filter((v) => v.available).length;
    base.outOfStockVariants = variants.filter((v) => !v.available).length;

    // Overall availability: true if at least one variant is purchasable
    const isOverallAvailable = Boolean(data.available) && base.inStockVariants > 0;
    base.isAvailable = isOverallAvailable;

    const hourlyBurn = Math.round(dailyAdSpend / 24);

    if (!isOverallAvailable || base.inStockVariants === 0) {
      base.status = 'CRITICAL_OUT_OF_STOCK';
      base.adWasteRisk = {
        level: 'CRITICAL',
        estimatedDailySpend: dailyAdSpend,
        hourlyBurnRateInr: hourlyBurn,
        estimatedWastePct: 100,
        actionHeadline: '🚨 100% SOLD OUT — BURNING AD BUDGET',
        actionAdvice: `Every active Meta ad click is landing on a Sold Out product. You are burning ~₹${hourlyBurn}/hour right now with 0% chance of conversion. PAUSE ADSET IMMEDIATELY.`,
      };
    } else if (base.outOfStockVariants > 0) {
      base.status = 'PARTIAL_OUT_OF_STOCK';
      const wastePct = Math.round((base.outOfStockVariants / base.totalVariants) * 60);
      base.adWasteRisk = {
        level: 'HIGH',
        estimatedDailySpend: dailyAdSpend,
        hourlyBurnRateInr: Math.round(hourlyBurn * (wastePct / 100)),
        estimatedWastePct: wastePct,
        actionHeadline: `⚠️ PARTIAL STOCKOUT (${base.outOfStockVariants}/${base.totalVariants} VARIANTS SOLD OUT)`,
        actionAdvice: `Popular sizes/variants are out of stock. Customers who click your ad will hit a dead size selection, increasing bounce rates by ~${wastePct}%. Consider restocking or directing traffic to in-stock variants.`,
      };
    } else {
      base.status = 'SAFE_IN_STOCK';
      base.adWasteRisk = {
        level: 'SAFE',
        estimatedDailySpend: dailyAdSpend,
        hourlyBurnRateInr: 0,
        estimatedWastePct: 0,
        actionHeadline: '✅ 100% IN STOCK & READY FOR ADS',
        actionAdvice: 'All product variants are fully in stock and ready for conversion. 24/7 Siren watchdog active.',
      };
    }

    base.responseTimeMs = Date.now() - startTime;
    return base;
  }

  /**
   * Parse HTML fallback with OpenGraph, JSON-LD, and DOM heuristics
   */
  private parseHtmlFallback(
    html: string,
    base: DiagnosticResult,
    dailyAdSpend: number,
    startTime: number
  ): DiagnosticResult {
    const hourlyBurn = Math.round(dailyAdSpend / 24);

    // 1. Extract Title
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      base.productTitle = titleMatch[1].replace(/ - [^-]+$/, '').trim();
    }

    // 2. Extract Image
    const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (imgMatch) {
      base.productImage = imgMatch[1];
    }

    // 3. Look for Out of Stock signals
    const hasSoldOutText = /("availability"\s*:\s*"https?:\/\/schema.org\/OutOfStock"|Sold Out|Out of stock|Currently unavailable|sold_out)/i.test(html);
    const hasInStockText = /("availability"\s*:\s*"https?:\/\/schema.org\/InStock"|Add to Cart|Buy Now|in_stock)/i.test(html);

    if (hasSoldOutText && !hasInStockText) {
      base.isAvailable = false;
      base.status = 'CRITICAL_OUT_OF_STOCK';
      base.adWasteRisk = {
        level: 'CRITICAL',
        estimatedDailySpend: dailyAdSpend,
        hourlyBurnRateInr: hourlyBurn,
        estimatedWastePct: 100,
        actionHeadline: '🚨 PRODUCT SOLD OUT (HTML HEURISTIC)',
        actionAdvice: `Landing page indicates product is Out of Stock. Burning ~₹${hourlyBurn}/hour. Pause ad campaign now.`,
      };
    } else {
      base.isAvailable = true;
      base.status = 'SAFE_IN_STOCK';
      base.adWasteRisk = {
        level: 'SAFE',
        estimatedDailySpend: dailyAdSpend,
        hourlyBurnRateInr: 0,
        estimatedWastePct: 0,
        actionHeadline: '✅ PRODUCT APPEARS IN STOCK',
        actionAdvice: 'Page loaded successfully with active purchase indicators.',
      };
    }

    base.responseTimeMs = Date.now() - startTime;
    return base;
  }

  /**
   * Helper to extract clean brand name from domain
   */
  public extractBrandFromDomain(domain: string): string {
    const clean = domain.replace(/^www\./i, '').split('.')[0];
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  /**
   * Bulk scan an array of URLs simultaneously
   */
  public async scanBulk(urls: string[], dailyAdSpend?: number): Promise<DiagnosticResult[]> {
    const cleanUrls = urls.map((u) => u.trim()).filter((u) => u.length > 5).slice(0, 25);
    const results = await Promise.allSettled(
      cleanUrls.map((url) => this.scanUrl(url, dailyAdSpend))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<DiagnosticResult> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /**
   * Store-Wide Auto-Discovery: Scans entire public Shopify catalog for OOS ad risks
   */
  public async scanStore(domainOrUrl: string): Promise<{
    domain: string;
    brandName: string;
    totalProducts: number;
    inStockCount: number;
    outOfStockCount: number;
    partialCount: number;
    vulnerabilityScorePct: number;
    estimatedPotentialWastePerDay: number;
    outOfStockProducts: Array<{
      id: number | string;
      title: string;
      handle: string;
      url: string;
      image?: string;
      price?: number;
      variantsCount: number;
      status: string;
    }>;
    scannedAt: string;
  }> {
    const { domain } = this.parseShopifyUrl(domainOrUrl);
    const brandName = this.extractBrandFromDomain(domain);
    const endpoint = `https://${domain}/products.json?limit=100`;

    try {
      const resp = await axios.get(endpoint, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      const products: any[] = resp.data?.products || [];
      const totalProducts = products.length;

      let inStockCount = 0;
      let outOfStockCount = 0;
      let partialCount = 0;
      const oosList: any[] = [];

      products.forEach((p) => {
        const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
        const inStockVariants = variants.filter((v) => v.available).length;
        const totalV = variants.length;
        const productUrl = `https://${domain}/products/${p.handle}`;
        const rawPrice = variants[0]?.price ? Number(variants[0].price) : undefined;
        const price = rawPrice && rawPrice > 10000 ? Math.round(rawPrice / 100) : rawPrice;

        if (totalV === 0 || inStockVariants === 0) {
          outOfStockCount++;
          oosList.push({
            id: p.id,
            title: p.title,
            handle: p.handle,
            url: productUrl,
            image: p.images?.[0]?.src || undefined,
            price,
            variantsCount: totalV,
            status: 'OUT_OF_STOCK',
          });
        } else if (inStockVariants < totalV) {
          partialCount++;
          oosList.push({
            id: p.id,
            title: p.title,
            handle: p.handle,
            url: productUrl,
            image: p.images?.[0]?.src || undefined,
            price,
            variantsCount: totalV,
            status: 'PARTIAL_STOCK',
          });
        } else {
          inStockCount++;
        }
      });

      const vulnerabilityScorePct = totalProducts > 0 
        ? Math.round((outOfStockCount / totalProducts) * 100) 
        : 0;

      const estimatedPotentialWastePerDay = outOfStockCount * 1200; // Estimated burn if even 1 adset runs per OOS SKU

      return {
        domain,
        brandName,
        totalProducts,
        inStockCount,
        outOfStockCount,
        partialCount,
        vulnerabilityScorePct,
        estimatedPotentialWastePerDay,
        outOfStockProducts: oosList,
        scannedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn(`[Watchdog] Store scan failed for ${domain}:`, err.message);
      return {
        domain,
        brandName,
        totalProducts: 0,
        inStockCount: 0,
        outOfStockCount: 0,
        partialCount: 0,
        vulnerabilityScorePct: 0,
        estimatedPotentialWastePerDay: 0,
        outOfStockProducts: [],
        scannedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get Live Dashboard Aggregated Metrics
   */
  public getDashboardStats(phone?: string) {
    const list = phone ? this.getMonitoredUrlsByPhone(phone) : this.getAllMonitoredUrls();
    const totalMonitored = list.length;
    const healthyCount = list.filter((m) => m.lastStatus === 'SAFE_IN_STOCK').length;
    const criticalCount = list.filter((m) => m.lastStatus === 'CRITICAL_OUT_OF_STOCK' || m.lastStatus === 'DEAD_LINK_404').length;
    const warningCount = list.filter((m) => m.lastStatus === 'PARTIAL_OUT_OF_STOCK').length;
    const totalDailySpend = list.reduce((acc, curr) => acc + (curr.dailyAdSpend || 3000), 0);
    const totalMonthlyProtected = totalDailySpend * 30;
    const activeHourlyBurn = list
      .filter((m) => m.lastStatus === 'CRITICAL_OUT_OF_STOCK' || m.lastStatus === 'DEAD_LINK_404')
      .reduce((acc, curr) => acc + Math.round((curr.dailyAdSpend || 3000) / 24), 0);

    return {
      totalMonitored,
      healthyCount,
      criticalCount,
      warningCount,
      totalDailySpend,
      totalMonthlyProtected,
      activeHourlyBurn,
      items: list,
    };
  }

  /**
   * Register a URL for 24/7 background monitoring
   */
  public registerMonitoredUrl(item: {
    url: string;
    brandName?: string;
    userPhone: string;
    dailyAdSpend?: number;
    webhookUrl?: string;
    alertRecipients?: string[];
  }): MonitoredUrl {
    const { domain, cleanUrl } = this.parseShopifyUrl(item.url);
    const brandName = item.brandName || this.extractBrandFromDomain(domain);
    const id = `mon_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const monitored: MonitoredUrl = {
      id,
      url: cleanUrl,
      brandName,
      userPhone: item.userPhone,
      dailyAdSpend: item.dailyAdSpend || WATCHDOG_RULES.DEFAULT_ESTIMATED_DAILY_BUDGET,
      lastStatus: 'UNKNOWN',
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      webhookUrl: item.webhookUrl,
      alertRecipients: item.alertRecipients,
    };

    this.monitoredUrls.set(id, monitored);
    this.savePersistedUrls();
    console.log(`🛡️ [Watchdog] Registered URL for monitoring: ${cleanUrl} (${brandName}) for ${item.userPhone}`);
    return monitored;
  }

  /**
   * Get all monitored URLs
   */
  public getAllMonitoredUrls(): MonitoredUrl[] {
    return Array.from(this.monitoredUrls.values());
  }

  /**
   * Get monitored URLs for a specific phone number
   */
  public getMonitoredUrlsByPhone(phone: string): MonitoredUrl[] {
    const clean = phone.replace(/[^0-9]/g, '');
    return Array.from(this.monitoredUrls.values()).filter((m) => m.userPhone.replace(/[^0-9]/g, '') === clean);
  }

  /**
   * Update monitored URL status after periodic check
   */
  public updateMonitoredStatus(id: string, status: DiagnosticStatus, sirenSent: boolean = false): void {
    const item = this.monitoredUrls.get(id);
    if (!item) return;

    item.lastStatus = status;
    item.lastCheckedAt = new Date().toISOString();
    if (sirenSent) {
      item.lastSirenSentAt = new Date().toISOString();
    }
    this.monitoredUrls.set(id, item);
    this.savePersistedUrls();
  }

  /**
   * Remove a monitored URL
   */
  public removeMonitoredUrl(id: string): boolean {
    const res = this.monitoredUrls.delete(id);
    if (res) this.savePersistedUrls();
    return res;
  }
}

export const watchdogService = new WatchdogService();
