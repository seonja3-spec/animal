import { defineConfig } from '@apps-in-toss/web-framework/config';

// Replace with the exact appName registered in the Apps in Toss console.
export default defineConfig({
  appName: 'animal-bell',
  brand: { primaryColor: '#16634F' },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: false,
  },
  permissions: [],
  webBundleDir: 'dist',
});
