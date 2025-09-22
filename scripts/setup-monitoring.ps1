# Azure Monitoring Setup for Benefits Chatbot
# Sets up Application Insights, alerts, and dashboards

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "benefits-chatbot-rg-$Environment"
)

Write-Host "📊 Setting up Azure monitoring for Benefits Chatbot..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow

# Get App Service name
$appServiceName = "benefits-chatbot-$Environment"
$appInsightsName = "benefits-chatbot-insights-$Environment"

Write-Host "🔍 Configuring Application Insights..." -ForegroundColor Blue

# Enable Application Insights for App Service
az monitor app-insights component connect-webapp --app $appInsightsName --resource-group $ResourceGroupName --web-app $appServiceName --resource-group $ResourceGroupName

# Create action group for alerts
Write-Host "📧 Creating action group for alerts..." -ForegroundColor Blue
$actionGroupName = "benefits-chatbot-alerts-$Environment"
az monitor action-group create --name $actionGroupName --resource-group $ResourceGroupName --short-name "benefits-alerts"

# Create monitoring alerts
Write-Host "🚨 Creating monitoring alerts..." -ForegroundColor Blue

# High CPU Usage Alert
az monitor metrics alert create --name "High CPU Usage - $Environment" --resource-group $ResourceGroupName --scopes "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.Web/sites/$appServiceName" --condition "avg Percentage CPU > 80" --description "Alert when CPU usage exceeds 80%" --evaluation-frequency 1m --window-size 5m --severity 2 --action $actionGroupName

# High Memory Usage Alert
az monitor metrics alert create --name "High Memory Usage - $Environment" --resource-group $ResourceGroupName --scopes "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.Web/sites/$appServiceName" --condition "avg Percentage Memory > 85" --description "Alert when memory usage exceeds 85%" --evaluation-frequency 1m --window-size 5m --severity 2 --action $actionGroupName

# Failed Requests Alert
az monitor metrics alert create --name "High Error Rate - $Environment" --resource-group $ResourceGroupName --scopes "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.Insights/components/$appInsightsName" --condition "count requests/failed > 10" --description "Alert when failed requests exceed 10" --evaluation-frequency 1m --window-size 5m --severity 1 --action $actionGroupName

# Response Time Alert
az monitor metrics alert create --name "High Response Time - $Environment" --resource-group $ResourceGroupName --scopes "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.Insights/components/$appInsightsName" --condition "avg requests/duration > 5000" --description "Alert when response time exceeds 5 seconds" --evaluation-frequency 1m --window-size 5m --severity 2 --action $actionGroupName

# Create custom dashboard
Write-Host "📊 Creating custom dashboard..." -ForegroundColor Blue
$dashboardName = "Benefits Chatbot Dashboard - $Environment"
$dashboardContent = @{
    "properties" = @{
        "lenses" = @{
            "0" = @{
                "order" = 0
                "parts" = @{
                    "0" = @{
                        "position" = @{
                            "x" = 0
                            "y" = 0
                            "rowSpan" = 4
                            "colSpan" = 6
                        }
                        "metadata" = @{
                            "inputs" = @{
                                "options" = @{
                                    "chart" = @{
                                        "metrics" = @(
                                            @{
                                                "resourceMetadata" = @{
                                                    "id" = "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.Web/sites/$appServiceName"
                                                }
                                                "name" = "Percentage CPU"
                                                "aggregationType" = 4
                                                "namespace" = "Microsoft.Web/sites"
                                                "metricVisualization" = @{
                                                    "displayName" = "CPU Percentage"
                                                }
                                            }
                                        )
                                        "title" = "CPU Usage"
                                        "visualization" = @{
                                            "chartType" = 2
                                            "legend" = @{
                                                "isVisible" = $true
                                                "position" = 2
                                            }
                                        }
                                    }
                                }
                            }
                            "type" = "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart"
                            "settings" = @{}
                        }
                    }
                }
            }
        }
        "metadata" = @{
            "model" = @{
                "timeRange" = @{
                    "value" = @{
                        "relative" = @{
                            "duration" = 86400000
                        }
                        "displayName" = "Last 24 hours"
                    }
                    "type" = 1
                }
                "filterLocale" = "en-us"
                "timeZone" = "UTC"
            }
        }
    }
    "name" = $dashboardName
    "type" = "Microsoft.Portal/dashboards"
    "location" = "East US"
    "tags" = @{
        "hidden-title" = $dashboardName
    }
}

# Create dashboard
$dashboardJson = $dashboardContent | ConvertTo-Json -Depth 10
$dashboardJson | Out-File -FilePath "dashboard.json" -Encoding UTF8

az portal dashboard create --resource-group $ResourceGroupName --name $dashboardName --input-path "dashboard.json"

# Clean up
Remove-Item "dashboard.json" -Force

Write-Host "`n✅ Monitoring setup completed!" -ForegroundColor Green
Write-Host "📊 Application Insights: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.Insights/components/$appInsightsName" -ForegroundColor White
Write-Host "📈 Dashboard: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.Portal/dashboards/$($dashboardName.Replace(' ', '%20'))" -ForegroundColor White
Write-Host "🚨 Alerts configured for:" -ForegroundColor Yellow
Write-Host "  - High CPU Usage (>80%)" -ForegroundColor White
Write-Host "  - High Memory Usage (>85%)" -ForegroundColor White
Write-Host "  - High Error Rate (>10 failed requests)" -ForegroundColor White
Write-Host "  - High Response Time (>5 seconds)" -ForegroundColor White
