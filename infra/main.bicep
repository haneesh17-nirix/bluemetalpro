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

@description('Backend container image tag (set by CI)')
param backendImageTag string = 'latest'

var prefix = 'bluemetal-${env}'
var tags = { environment: env, project: 'bluemetal-pro' }
var acrName = replace('${prefix}acr', '-', '')

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
    // publicNetworkAccess is managed via firewallRules — do not set here
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgres
  name: 'stonecrusherdb'
  properties: { charset: 'UTF8', collation: 'en_US.UTF8' }
}

// Allow all Azure-internal services (0.0.0.0 → 0.0.0.0 is the Azure sentinel)
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
// Azure Container Registry
// ============================================================
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: true   // needed so Container Apps can pull with username/password
  }
}

// ============================================================
// Log Analytics (shared by all Container Apps)
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
// Static Web App (Next.js)
// ============================================================
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${prefix}-web'
  location: 'eastus2'
  tags: tags
  sku: { name: 'Free', tier: 'Free' }
  properties: { stagingEnvironmentPolicy: 'Disabled' }
}

// ============================================================
// Backend API — Container App
// ============================================================
var storageConnStr = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
var notifHubConnStr = listKeys('${notifNamespace.id}/notificationHubs/${notifHub.name}/authorizationRules/DefaultFullSharedAccessSignature', notifHub.apiVersion).primaryConnectionString

resource apiContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-api'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3001
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'db-password',  value: dbAdminPassword }
        { name: 'jwt-secret',   value: jwtSecret }
        { name: 'storage-conn', value: storageConnStr }
        { name: 'notif-conn',   value: notifHubConnStr }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          // CI overrides this via `az containerapp update --image`
          image: backendImageTag == 'latest' ? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' : '${acr.properties.loginServer}/bluemetal-api:${backendImageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'NODE_ENV',              value: env }
            { name: 'PORT',                  value: '3001' }
            { name: 'DB_HOST',               value: postgres.properties.fullyQualifiedDomainName }
            { name: 'DB_PORT',               value: '5432' }
            { name: 'DB_NAME',               value: 'stonecrusherdb' }
            { name: 'DB_USER',               value: dbAdminUser }  // Flexible Server: plain username, no @server suffix
            { name: 'DB_PASSWORD',           secretRef: 'db-password' }
            { name: 'DB_SSL',                value: 'true' }
            { name: 'JWT_SECRET',            secretRef: 'jwt-secret' }
            { name: 'AZURE_STORAGE_CONNECTION_STRING', secretRef: 'storage-conn' }
            { name: 'AZURE_NOTIFICATION_HUB_CONNECTION_STRING', secretRef: 'notif-conn' }
            { name: 'AZURE_NOTIFICATION_HUB_NAME', value: notifHub.name }
            { name: 'CORS_ORIGINS',          value: 'https://${staticWebApp.properties.defaultHostname}' }
            { name: 'MEDIAMTX_API_URL',      value: 'https://${mediamtxApp.properties.configuration.ingress.fqdn}' }
            { name: 'MEDIAMTX_HLS_URL',      value: 'https://${mediamtxApp.properties.configuration.ingress.fqdn}' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

// ============================================================
// MediaMTX — RTSP→HLS transcoding pipeline
// Clients pull HLS over HTTPS; cameras push RTSP directly to
// the Container App's FQDN on port 8554 (TCP, external ingress
// is HTTP-only on Container Apps — use RTSP push from within
// the same VNet or via the weighbridge agent).
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
        targetPort: 8888    // HLS HTTP served on 8888
        transport: 'http'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'mediamtx'
          // CI pushes aler9/mediamtx:latest to ACR and updates this
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'MTX_HLSADDRESS',     value: ':8888' }
            { name: 'MTX_RTSPADDRESS',    value: ':8554' }
            { name: 'MTX_APIADDRESS',     value: ':9997' }
            { name: 'MTX_HLSALWAYSREMUX', value: 'yes' }
            { name: 'MTX_LOGLEVEL',       value: 'warn' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 2 }
    }
  }
}

// ============================================================
// Outputs
// ============================================================
output apiUrl              string = 'https://${apiContainerApp.properties.configuration.ingress.fqdn}'
output webUrl              string = 'https://${staticWebApp.properties.defaultHostname}'
output dbHost              string = postgres.properties.fullyQualifiedDomainName
output acrLoginServer      string = acr.properties.loginServer
output storageAccountName  string = storage.name
output notificationHubName string = notifHub.name
output notifHubNamespace   string = notifNamespace.name
output mediamtxHlsUrl      string = 'https://${mediamtxApp.properties.configuration.ingress.fqdn}'
output containerEnvName    string = containerEnv.name
