/**
 * Installs the weighbridge agent as a Windows Service using node-windows.
 * Run once on the on-site PC:  npm run install-service
 *
 * Requires Administrator privileges.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'BlueMetal Weighbridge Agent',
  description: 'BlueMetal Pro — reads weighbridge serial data and syncs to cloud',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [],
  env: [
    { name: 'NODE_ENV', value: 'production' },
  ],
});

svc.on('install', () => {
  console.log('Service installed. Starting…');
  svc.start();
});

svc.on('start', () => {
  console.log('BlueMetal Weighbridge Agent started as Windows Service.');
  console.log('Manage via: services.msc or sc.exe');
});

svc.on('error', (err: any) => {
  console.error('Service error:', err);
});

svc.install();
