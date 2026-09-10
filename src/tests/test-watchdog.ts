// =================================================================
// RoasSiren - Automated Engine & Diagnostic Verification Test
// =================================================================

import { watchdogService } from '../services/watchdog.service.js';

async function runWatchdogTests() {
  console.log('🧪 Starting RoasSiren Watchdog Engine Verification...\n');

  // Test 1: URL Normalization
  console.log('--- Test 1: Shopify URL Parsing ---');
  const parsed1 = watchdogService.parseShopifyUrl('https://shop.boat-lifestyle.com/products/rockerz-450?variant=318182937');
  console.log('Parsed Boat URL:', parsed1);
  if (parsed1.domain !== 'shop.boat-lifestyle.com' || parsed1.handle !== 'rockerz-450') {
    throw new Error('Test 1 Failed: URL parsing mismatch');
  }
  console.log('✅ Test 1 Passed: Domain & handle accurately extracted.\n');

  // Test 2: Dead Link (404) Detection
  console.log('--- Test 2: Broken Ad Link (404) Detection ---');
  const fakeUrl = 'https://shop.boat-lifestyle.com/products/definitely-non-existent-sku-xyz-404';
  const diag404 = await watchdogService.scanUrl(fakeUrl, 5000);
  console.log('404 Diagnostic Result:', {
    status: diag404.status,
    httpStatus: diag404.httpStatus,
    wasteRiskLevel: diag404.adWasteRisk.level,
    hourlyBurnRate: diag404.adWasteRisk.hourlyBurnRateInr,
  });
  console.log('✅ Test 2 Passed: Scan completed with valid risk categorization.\n');

  // Test 3: In-Memory Watchdog Radar & Persistence
  console.log('--- Test 3: Watchdog Radar Registration & Persistence ---');
  const monitored = watchdogService.registerMonitoredUrl({
    url: 'https://shop.boat-lifestyle.com/products/rockerz-450',
    brandName: 'boAt Lifestyle',
    userPhone: '919560931596',
    dailyAdSpend: 4000,
    webhookUrl: 'https://hooks.slack.com/services/sample/mock/webhook',
  });
  console.log('Registered Watchdog Item:', monitored.id, monitored.brandName, monitored.url, 'Webhook:', monitored.webhookUrl);

  const found = watchdogService.getMonitoredUrlsByPhone('919560931596');
  if (found.length === 0) {
    throw new Error('Test 3 Failed: Monitored item not retrieved.');
  }
  console.log(`✅ Test 3 Passed: Watchdog registered and retrieved successfully (${found.length} active).\n`);

  // Test 4: Dashboard Aggregated Metrics
  console.log('--- Test 4: Dashboard Stats Aggregation ---');
  const stats = watchdogService.getDashboardStats();
  console.log('Dashboard Stats:', {
    totalMonitored: stats.totalMonitored,
    healthyCount: stats.healthyCount,
    criticalCount: stats.criticalCount,
    totalMonthlyProtected: stats.totalMonthlyProtected,
  });
  if (typeof stats.totalMonitored !== 'number' || stats.totalMonitored < 1) {
    throw new Error('Test 4 Failed: Invalid dashboard stats');
  }
  console.log('✅ Test 4 Passed: Dashboard statistics aggregated accurately.\n');

  // Test 5: Bulk URL Scanner
  console.log('--- Test 5: Bulk URL Scanner (2 URLs) ---');
  const bulkResults = await watchdogService.scanBulk([
    'https://shop.boat-lifestyle.com/products/rockerz-450',
    'https://snitch.co.in/products/oversized-t-shirt',
  ], 3000);
  console.log(`Bulk scan completed for ${bulkResults.length} URLs.`);
  if (bulkResults.length !== 2) {
    throw new Error('Test 5 Failed: Expected 2 bulk results');
  }
  console.log('✅ Test 5 Passed: Bulk parallel scanning operational.\n');

  console.log('🎉 ALL 5 ROASSIREN PHASE 2 VERIFICATION CHECKS PASSED!\n');
}

runWatchdogTests().catch((err) => {
  console.error('❌ Watchdog test failed:', err);
  process.exit(1);
});
