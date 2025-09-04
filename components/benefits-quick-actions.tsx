import { motion } from 'framer-motion';
import {
  Shield,
  Calculator,
  BarChart3,
  FileText,
  HelpCircle,
  Zap,
} from 'lucide-react';
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
    label: 'My Dashboard',
    description: 'View benefits overview',
    prompt: 'Show my benefits dashboard',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    icon: <Shield className="size-4" />,
    label: 'Compare Plans',
    description: 'See plan options',
    prompt: 'Compare health insurance plans',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    icon: <Calculator className="size-4" />,
    label: 'Cost Calculator',
    description: 'Estimate costs',
    prompt: 'Show me the cost calculator',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    icon: <FileText className="size-4" />,
    label: 'Open Enrollment',
    description: 'Important dates',
    prompt: 'What are the open enrollment deadlines?',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    icon: <Zap className="size-4" />,
    label: 'HSA Info',
    description: 'Health savings account',
    prompt: 'Tell me about HSA benefits and contribution limits',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  {
    icon: <HelpCircle className="size-4" />,
    label: 'Help',
    description: 'Get assistance',
    prompt: 'What can you help me with regarding my benefits?',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  },
];

interface BenefitsQuickActionsProps {
  onActionClick: (prompt: string) => void;
  isVisible?: boolean;
}

export function BenefitsQuickActions({
  onActionClick,
  isVisible = true,
}: BenefitsQuickActionsProps) {
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.05,
              type: 'spring',
              stiffness: 100,
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              className={`size-full ${action.color} hover:bg-gray-800 hover:text-white transition-all duration-200 shadow-sm hover:shadow-lg border-2`}
              onClick={() => onActionClick(action.prompt)}
            >
              <div className="flex flex-col items-center gap-2 py-4 px-3 whitespace-normal text-center">
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {action.icon}
                </motion.div>
                <span className="font-semibold text-sm">{action.label}</span>
                <span className="text-xs opacity-70">{action.description}</span>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
