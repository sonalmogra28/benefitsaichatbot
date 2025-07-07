import { motion } from 'framer-motion';
import { Shield, Calculator, BarChart3, FileText, HelpCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  prompt: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    icon: <BarChart3 className="size-4" />,
    label: "My Dashboard",
    description: "View benefits overview",
    prompt: "Show my benefits dashboard",
    color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
  },
  {
    icon: <Shield className="size-4" />,
    label: "Compare Plans",
    description: "See plan options",
    prompt: "Compare health insurance plans",
    color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
  },
  {
    icon: <Calculator className="size-4" />,
    label: "Cost Calculator",
    description: "Estimate costs",
    prompt: "Show me the cost calculator",
    color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
  },
  {
    icon: <FileText className="size-4" />,
    label: "Open Enrollment",
    description: "Important dates",
    prompt: "What are the open enrollment deadlines?",
    color: "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
  },
  {
    icon: <Zap className="size-4" />,
    label: "HSA Info",
    description: "Health savings account",
    prompt: "Tell me about HSA benefits and contribution limits",
    color: "bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
  },
  {
    icon: <HelpCircle className="size-4" />,
    label: "Help",
    description: "Get assistance",
    prompt: "What can you help me with regarding my benefits?",
    color: "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
  }
];

interface BenefitsQuickActionsProps {
  onActionClick: (prompt: string) => void;
  isVisible?: boolean;
}

export function BenefitsQuickActions({ onActionClick, isVisible = true }: BenefitsQuickActionsProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto mb-4"
    >
      <div className="text-sm text-muted-foreground mb-3 text-center">
        Quick actions to get started
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <Button
              variant="outline"
              className={`w-full h-auto p-3 flex flex-col items-center gap-2 text-xs border ${action.color} transition-all duration-200 hover:scale-105`}
              onClick={() => onActionClick(action.prompt)}
            >
              {action.icon}
              <div className="font-medium">{action.label}</div>
              <div className="text-xs opacity-75 hidden md:block">
                {action.description}
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}