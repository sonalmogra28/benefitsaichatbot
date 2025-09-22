// Azure Communication Services - $10-20/month
@description('Azure Communication Services for email and SMS notifications')
resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: 'benefits-chatbot-comm-${environment}'
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

// Email domain (optional)
resource emailDomain 'Microsoft.Communication/communicationServices/domains@2023-04-01' = {
  parent: communicationService
  name: 'benefits-chatbot.com'
  properties: {
    domainManagement: 'CustomerManaged'
    validSenderUsernames: [
      'noreply'
      'support'
      'notifications'
    ]
  }
}

// SMS configuration
resource smsConfiguration 'Microsoft.Communication/communicationServices/sms@2023-04-01' = {
  parent: communicationService
  name: 'default'
  properties: {
    phoneNumber: '+1234567890' // Replace with actual phone number
    countryCode: 'US'
  }
}
