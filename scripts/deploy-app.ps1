# Deploy Benefits Chatbot Application to Azure
# This script builds and deploys the Next.js application to Azure App Service

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "benefits-chatbot-rg-$Environment",
    
    [Parameter(Mandatory=$false)]
    [string]$AppServiceName = "benefits-chatbot-$Environment"
)

Write-Host "🚀 Deploying Benefits Chatbot Application..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "App Service: $AppServiceName" -ForegroundColor Yellow

# Check if required files exist
if (!(Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix the errors and try again." -ForegroundColor Red
    exit 1
}

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Blue
$deploymentPath = "deployment-package"
if (Test-Path $deploymentPath) {
    Remove-Item -Recurse -Force $deploymentPath
}
New-Item -ItemType Directory -Path $deploymentPath

# Copy necessary files
$filesToCopy = @(
    ".next",
    "public",
    "package.json",
    "package-lock.json",
    "next.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "app",
    "components",
    "lib",
    "types",
    "context",
    "hooks",
    "config",
    "azure"
)

foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        Write-Host "Copying $file..." -ForegroundColor Gray
        Copy-Item -Recurse -Path $file -Destination $deploymentPath
    }
}

# Create web.config for Azure App Service
Write-Host "⚙️ Creating web.config..." -ForegroundColor Blue
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="false" />
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpErrors existingResponse="PassThrough" />
    <iisnode watchedFiles="web.config;*.js"/>
  </system.webServer>
</configuration>
"@

$webConfig | Out-File -FilePath "$deploymentPath/web.config" -Encoding UTF8

# Create server.js for Azure App Service
Write-Host "⚙️ Creating server.js..." -ForegroundColor Blue
$serverJs = @"
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
"@

$serverJs | Out-File -FilePath "$deploymentPath/server.js" -Encoding UTF8

# Deploy to Azure App Service
Write-Host "🚀 Deploying to Azure App Service..." -ForegroundColor Blue
az webapp deployment source config-zip --resource-group $ResourceGroupName --name $AppServiceName --src "$deploymentPath.zip"

# Create zip file
Write-Host "📦 Creating deployment zip..." -ForegroundColor Blue
Compress-Archive -Path "$deploymentPath\*" -DestinationPath "$deploymentPath.zip" -Force

# Deploy using zip deployment
Write-Host "🚀 Deploying to Azure..." -ForegroundColor Blue
az webapp deployment source config-zip --resource-group $ResourceGroupName --name $AppServiceName --src "$deploymentPath.zip"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Application deployed successfully!" -ForegroundColor Green
    Write-Host "App URL: https://$AppServiceName.azurewebsites.net" -ForegroundColor White
    
    # Clean up
    Write-Host "🧹 Cleaning up..." -ForegroundColor Blue
    Remove-Item -Recurse -Force $deploymentPath
    Remove-Item -Force "$deploymentPath.zip"
    
    Write-Host "`n🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host "Your Benefits Chatbot is now live at: https://$AppServiceName.azurewebsites.net" -ForegroundColor White
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}
