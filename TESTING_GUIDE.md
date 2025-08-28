# Testing Guide

This guide provides instructions for testing the Benefits AI Platform to ensure it is ready for production.

## Testing Checklist

### 1. Authentication
- [ ] User registration (employee)
- [ ] User login and logout
- [ ] Role-based access control (super admin, company admin, employee)
- [ ] Protected routes

### 2. Super Admin
- [ ] Create, view, and manage companies
- [ ] Create, view, and manage users
- [ ] Assign roles to users
- [ ] Upload and manage documents
- [ ] View analytics dashboard

### 3. Company Admin
- [ ] View and manage employees
- [ ] View and manage benefit plans
- [ ] View and manage enrollments

### 4. Chat
- [ ] Send and receive messages
- [ ] View chat history
- [ ] Create new chats
- [ ] RAG-powered responses

### 5. Document Processing
- [ ] Upload a document
- [ ] Verify that the document is processed correctly
- [ ] Verify that the embeddings are stored in Firestore

### 6. Company Branding
- [ ] Upload a company logo
- [ ] Set a primary color
- [ ] Verify that the branding is applied correctly

## Testing Instructions

### 1. Authentication
1.  Register a new employee user.
2.  Log in and out with the new user.
3.  Create a new super admin user and a new company admin user.
4.  Log in with each user and verify that they can only access the routes that they are authorized to access.

### 2. Super Admin
1.  Log in as a super admin.
2.  Create a new company.
3.  Create a new user and assign them the company admin role.
4.  Upload a document.
5.  View the analytics dashboard and verify that the data is correct.

### 3. Company Admin
1.  Log in as a company admin.
2.  Verify that you can view the employees, benefit plans, and enrollments for your company.

### 4. Chat
1.  Log in as an employee.
2.  Send a message to the chatbot.
3.  Verify that you receive a response.
4.  View your chat history.
5.  Create a new chat.

### 5. Document Processing
1.  Log in as a super admin.
2.  Upload a document.
3.  Go to the Firestore console and verify that a new document has been created in the `documents` collection.
4.  Verify that the document contains the correct text and embeddings.

### 6. Company Branding
1.  Log in as a super admin.
2.  Go to the branding page for a company.
3.  Upload a logo and set a primary color.
4.  Log in as an employee of that company and verify that the branding is applied correctly.
