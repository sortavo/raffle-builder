import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

const PRODUCTION_URL = 'https://www.sortavo.com';
const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';

// Homepage availability check
new ApiCheck('homepage-availability', {
  name: 'Homepage Availability',
  request: {
    method: 'GET',
    url: PRODUCTION_URL,
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
    AssertionBuilder.responseTime().lessThan(5000),
  ],
  tags: ['critical', 'homepage'],
  degradedResponseTime: 3000,
  maxResponseTime: 10000,
});

// Health check endpoint
new ApiCheck('health-check-api', {
  name: 'Health Check API',
  request: {
    method: 'GET',
    url: `${SUPABASE_URL}/functions/v1/health-check`,
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
    AssertionBuilder.jsonBody('$.status').equals('operational'),
  ],
  tags: ['critical', 'api', 'health'],
  degradedResponseTime: 2000,
  maxResponseTime: 5000,
});

// Auth page availability
new ApiCheck('auth-page', {
  name: 'Auth Page Availability',
  request: {
    method: 'GET',
    url: `${PRODUCTION_URL}/auth`,
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
    AssertionBuilder.responseTime().lessThan(5000),
  ],
  tags: ['critical', 'auth'],
});

// Dashboard page (should redirect to auth if not logged in)
new ApiCheck('dashboard-page', {
  name: 'Dashboard Page',
  request: {
    method: 'GET',
    url: `${PRODUCTION_URL}/dashboard`,
    followRedirects: true,
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
  ],
  tags: ['dashboard'],
});

// Pricing page
new ApiCheck('pricing-page', {
  name: 'Pricing Page',
  request: {
    method: 'GET',
    url: `${PRODUCTION_URL}/pricing`,
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
    AssertionBuilder.responseTime().lessThan(5000),
  ],
  tags: ['public', 'pricing'],
});

// Help center
new ApiCheck('help-center', {
  name: 'Help Center',
  request: {
    method: 'GET',
    url: `${PRODUCTION_URL}/help`,
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
  ],
  tags: ['public', 'help'],
});

// System status page
new ApiCheck('status-page', {
  name: 'System Status Page',
  request: {
    method: 'GET',
    url: `${PRODUCTION_URL}/status`,
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
  ],
  tags: ['public', 'status'],
});
