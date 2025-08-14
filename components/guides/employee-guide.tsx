// components/guides/employee-guide.tsx
export function EmployeeGuide() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Employee Guide</h1>
      <div className="prose">
        <h2>Welcome to the Benefits AI Chatbot!</h2>
        <p>
          This guide will walk you through the key features of the employee
          interface.
        </p>
        <h3>Chat</h3>
        <p>
          The chat page allows you to have a conversation with the Benefits
          AI Chatbot. You can ask the chatbot questions about your company's
          benefits, and it will provide you with an answer. You can start a new
          conversation by clicking the "New Chat" button. You can also clear
          the chat history by clicking the "Clear Chat" button.
        </p>
        <h3>Onboarding</h3>
        <p>
          The onboarding page will walk you through the process of setting up
          your account. You can skip the onboarding process by clicking the
          "Skip" button.
        </p>
      </div>
    </div>
  );
}
