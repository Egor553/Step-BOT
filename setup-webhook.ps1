# Скрипт для быстрой настройки Telegram Bot Webhook

$BOT_TOKEN = "7700333505:AAFBkHJuyMNzusPDCa-p6rrYymytm3OJ_Jo"
$WEBHOOK_URL = "https://aura-psi-two.vercel.app"

Write-Host "🔧 Настройка Telegram Bot Webhook..." -ForegroundColor Cyan

# Установка webhook
$setWebhookUrl = "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=$WEBHOOK_URL"
Write-Host "`n1. Устанавливаю webhook: $WEBHOOK_URL" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri $setWebhookUrl -Method Get
Write-Host "Результат: $($response.description)" -ForegroundColor Green

# Проверка webhook
Start-Sleep -Seconds 2
$getWebhookUrl = "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
Write-Host "`n2. Проверяю webhook..." -ForegroundColor Yellow
$webhookInfo = Invoke-RestMethod -Uri $getWebhookUrl -Method Get

Write-Host "`n✅ Информация о webhook:" -ForegroundColor Green
Write-Host "URL: $($webhookInfo.result.url)" -ForegroundColor White
Write-Host "Pending updates: $($webhookInfo.result.pending_update_count)" -ForegroundColor White
Write-Host "Last error: $($webhookInfo.result.last_error_message)" -ForegroundColor $(if ($webhookInfo.result.last_error_message) { "Red" } else { "Green" })

Write-Host "`n🎉 Готово!" -ForegroundColor Green
