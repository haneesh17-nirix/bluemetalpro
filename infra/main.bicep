targetScope = 'resourceGroup'

@description('Environment name: dev, staging, prod')
param env string = 'prod'

@description('Azure region')
param location string = resourceGroup().location

@description('PostgreSQL admin username')
param dbAdminUser string

@secure()
@description('PostgreSQL admin password')
param dbAdminPassword string

@description('JWT secret for API tokens')
@secure()
param jwtSecret string

var prefix = 'bluemetal-${env}'
var tags = { environment: env, project: 'bluemetal-pro' }

// ============================================================
// PostgreSQL Flexible Server
// ============================================================
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${prefix}-postgres'
  location: location
  tags: tags
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '15'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgres
  name: 'stonecrusherdb'
  properties: { charset: 'UTF8', collation: 'en_US.UTF8' }
}

resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

// ============================================================
// Storage Account
// ============================================================
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: replace('${prefix}storage', '-', '')
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    supportsHttpsTrafficOnly: true
  }
}

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/stone-crusher-docs'
  properties: { publicAccess: 'Blob' }
}

// ============================================================
// Notification Hub
// ============================================================
resource notifNamespace 'Microsoft.NotificationHubs/namespaces@2023-01-01-preview' = {
  name: '${prefix}-notif-ns'
  location: location
  tags: tags
  sku: { name: 'Free' }
  properties: { namespaceType: 'NotificationHub' }
}

resource notifHub 'Microsoft.NotificationHubs/namespaces/notificationHubs@2023-01-01-preview' = {
  parent: notifNamespace
  name: '${prefix}-hub'
  location: location
  properties: {}
}

// ============================================================
// App Service Plan + API App Service
// ============================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${prefix}-asp'
  location: location
  tags: tags
  sku: { name: 'B1', tier: 'Basic' }
  kind: 'linux'
  properties: { reserved: true }
}

resource apiApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${prefix}-api'
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appSettings: [
        { name: 'NODE_ENV', value: env }
        { name: 'PORT', value: '3001' }
        { name: 'JWT_SECRET', value: jwtSecret }
        { name: 'DB_HOST', value: postgres.properties.fullyQualifiedDomainName }
        { name: 'DB_PORT', value: '5432' }
        { name: 'DB_NAME', value: 'stonecrusherdb' }
        { name: 'DB_USER', value: '${dbAdminUser}@${postgres.name}' }
        { name: 'DB_PASSWORD', value: dbAdminPassword }
        { name: 'DB_SSL', value: 'true' }
        { name: 'AZURE_STORAGE_CONNECTION_STRING', value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value}' }
        { name: 'AZURE_NOTIFICATION_HUB_NAME', value: notifHub.name }
        { name: 'CORS_ORIGINS', value: 'https://${staticWebApp.properties.defaultHostname}' }
      ]
      alwaysOn: true
    }
  }
}

// ============================================================
// Static Web App (Next.js web dashboard)
// ============================================================
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${prefix}-web'
  location: 'eastus2'  // Static Web Apps available regions
  tags: tags
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    stagingEnvironmentPolicy: 'Disabled'
  }
}

// ============================================================
// Log Analytics (for Container Apps)
// ============================================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}

// ============================================================
// Container Apps Environment
// ============================================================
resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${prefix}-container-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ============================================================
// MediaMTX — RTSP→HLS transcoding pipeline
// ============================================================
resource mediamtxApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-mediamtx'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8888          // HLS HTTP
        transport: 'http'
        allowInsecure: false
        additionalPortMappings: [
          { targetPort: 8554, exposedPort: 8554, external: true }   // RTSP in
          { targetPort: 9997, exposedPort: 9997, external: false }  // REST API (internal only)
        ]
      }
    }
    template: {
      containers: [
        {
          name: 'mediamtx'
          image: 'bluenewmedia/mediamtx:latest'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'MTX_HLSADDRESS',      value: ':8888' }
            { name: 'MTX_RTSPADDRESS',     value: ':8554' }
            { name: 'MTX_APIADDRESS',      value: ':9997' }
            { name: 'MTX_HLSALWAYSREMUX',  value: 'yes' }
            { name: 'MTX_LOGLEVEL',        value: 'warn' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 2 }
    }
  }
}

// Wire MEDIAMTX env vars into API app (append to existing settings)
resource apiMediamtxSettings 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: apiApp
  name: 'appsettings'
  properties: {
    NODE_ENV: env
    PORT: '3001'
    JWT_SECRET: jwtSecret
    DB_HOST: postgres.properties.fullyQualifiedDomainName
    DB_PORT: '5432'
    DB_NAME: 'stonecrusherdb'
    DB_USER: '${dbAdminUser}@${postgres.name}'
    DB_PASSWORD: dbAdminPassword
    DB_SSL: 'true'
    AZURE_STORAGE_CONNECTION_STRING: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value}'
    AZURE_NOTIFICATION_HUB_NAME: notifHub.name
    CORS_ORIGINS: 'https://${staticWebApp.properties.defaultHostname}'
    MEDIAMTX_API_URL: 'http://${mediamtxApp.properties.configuration.ingress.fqdn}:9997'
    MEDIAMTX_HLS_URL: 'https://${mediamtxApp.properties.configuration.ingress.fqdn}'
  }
}

// ============================================================
// Outputs
// ============================================================
output apiUrl string = 'https://${apiApp.properties.defaultHostName}'
output webUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output dbHost string = postgres.properties.fullyQualifiedDomainName
output storageAccountName string = storage.name
output notificationHubName string = notifHub.name
output notificationHubNamespace string = notifNamespace.name
output mediamtxHlsUrl string = 'https://${mediamtxApp.properties.configuration.ingress.fqdn}'
