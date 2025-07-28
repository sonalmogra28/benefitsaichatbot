# Style Guide - Benefits Assistant Chatbot v2.0

## 1. Brand Foundation

### Brand Personality
- **Knowledgeable**: Expert-level understanding presented simply
- **Approachable**: Friendly without being overly casual
- **Trustworthy**: Accurate, transparent, and reliable
- **Empathetic**: Understanding that benefits decisions are personal
- **Efficient**: Respects users' time with quick, clear answers

### Voice Attributes
- **Tone**: Professional yet warm, like a helpful colleague
- **Language**: Clear, jargon-free unless explaining terms
- **Perspective**: First person plural ("we") for company, second person ("you") for user
- **Energy**: Calm and reassuring, never pushy or sales-focused

## 2. Visual Design System

### Color Palette

```scss
// Primary Colors
$primary-blue: #0066CC;      // Trust, stability
$primary-blue-light: #4D94FF;
$primary-blue-dark: #004C99;

// Secondary Colors  
$secondary-green: #00A851;    // Success, savings
$secondary-orange: #FF6B35;   // Alerts, attention
$secondary-purple: #6B5B95;   // Premium features

// Neutral Colors
$neutral-900: #1A1A1A;        // Primary text
$neutral-700: #4A4A4A;        // Secondary text
$neutral-500: #767676;        // Muted text
$neutral-300: #D4D4D4;        // Borders
$neutral-100: #F5F5F5;        // Backgrounds
$white: #FFFFFF;              // Base

// Semantic Colors
$success: #00A851;
$warning: #FFA500;
$error: #DC3545;
$info: #17A2B8;

// Gradient Definitions
$gradient-primary: linear-gradient(135deg, $primary-blue 0%, $primary-blue-light 100%);
$gradient-success: linear-gradient(135deg, $secondary-green 0%, #00C961 100%);
$gradient-premium: linear-gradient(135deg, $secondary-purple 0%, #8B78B8 100%);
```

### Typography

```scss
// Font Families
$font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
$font-mono: 'JetBrains Mono', 'Courier New', monospace;

// Font Sizes
$text-xs: 0.75rem;     // 12px
$text-sm: 0.875rem;    // 14px
$text-base: 1rem;      // 16px
$text-lg: 1.125rem;    // 18px
$text-xl: 1.25rem;     // 20px
$text-2xl: 1.5rem;     // 24px
$text-3xl: 1.875rem;   // 30px
$text-4xl: 2.25rem;    // 36px

// Font Weights
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;

// Line Heights
$leading-tight: 1.25;
$leading-normal: 1.5;
$leading-relaxed: 1.75;

// Type Scale
h1 {
  font-size: $text-4xl;
  font-weight: $font-bold;
  line-height: $leading-tight;
  color: $neutral-900;
}

h2 {
  font-size: $text-3xl;
  font-weight: $font-semibold;
  line-height: $leading-tight;
  color: $neutral-900;
}

h3 {
  font-size: $text-2xl;
  font-weight: $font-semibold;
  line-height: $leading-normal;
  color: $neutral-900;
}

body {
  font-size: $text-base;
  font-weight: $font-normal;
  line-height: $leading-normal;
  color: $neutral-700;
}
```

### Spacing System

```scss
// Base unit: 4px
$space-1: 0.25rem;   // 4px
$space-2: 0.5rem;    // 8px
$space-3: 0.75rem;   // 12px
$space-4: 1rem;      // 16px
$space-5: 1.25rem;   // 20px
$space-6: 1.5rem;    // 24px
$space-8: 2rem;      // 32px
$space-10: 2.5rem;   // 40px
$space-12: 3rem;     // 48px
$space-16: 4rem;     // 64px
$space-20: 5rem;     // 80px
$space-24: 6rem;     // 96px

// Component Spacing
$card-padding: $space-6;
$button-padding-x: $space-4;
$button-padding-y: $space-2;
$input-padding: $space-3;
$modal-padding: $space-8;
```

### Border & Shadow System

```scss
// Border Radius
$radius-sm: 0.25rem;    // 4px
$radius-md: 0.5rem;     // 8px
$radius-lg: 0.75rem;    // 12px
$radius-xl: 1rem;       // 16px
$radius-full: 9999px;   // Pills

// Shadows
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

// Elevation System
.elevation-1 {
  box-shadow: $shadow-sm;
}

.elevation-2 {
  box-shadow: $shadow-md;
}

.elevation-3 {
  box-shadow: $shadow-lg;
}

.elevation-4 {
  box-shadow: $shadow-xl;
}
```

## 3. Component Design Standards

### Buttons

```tsx
// Primary Button
<Button variant="primary" size="md">
  Compare Plans
</Button>

// Styles
.btn-primary {
  background: $primary-blue;
  color: $white;
  padding: $button-padding-y $button-padding-x;
  border-radius: $radius-md;
  font-weight: $font-medium;
  transition: all 0.2s ease;
  
  &:hover {
    background: $primary-blue-dark;
    transform: translateY(-1px);
    box-shadow: $shadow-md;
  }
  
  &:active {
    transform: translateY(0);
  }
}

// Button Variants
.btn-secondary {
  background: $white;
  color: $primary-blue;
  border: 1px solid $primary-blue;
}

.btn-success {
  background: $secondary-green;
  color: $white;
}

.btn-ghost {
  background: transparent;
  color: $neutral-700;
}
```

### Cards

```tsx
// Plan Comparison Card
<Card className="plan-card">
  <CardHeader>
    <h3>Premium PPO</h3>
    <Badge variant="popular">Most Popular</Badge>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Styles
.plan-card {
  background: $white;
  border: 1px solid $neutral-300;
  border-radius: $radius-lg;
  padding: $card-padding;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $primary-blue;
    box-shadow: $shadow-lg;
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: $primary-blue;
    border-width: 2px;
    background: rgba($primary-blue, 0.05);
  }
}
```

### Form Elements

```scss
// Input Fields
.input {
  width: 100%;
  padding: $input-padding;
  border: 1px solid $neutral-300;
  border-radius: $radius-md;
  font-size: $text-base;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: $primary-blue;
    box-shadow: 0 0 0 3px rgba($primary-blue, 0.1);
  }
  
  &.error {
    border-color: $error;
  }
}

// Select Dropdowns
.select {
  @extend .input;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right $space-3 center;
  background-size: $space-4;
  padding-right: $space-10;
}
```

### Chat Interface

```scss
// Message Bubbles
.message {
  max-width: 70%;
  margin-bottom: $space-4;
  
  &.user {
    margin-left: auto;
    
    .bubble {
      background: $primary-blue;
      color: $white;
      border-radius: $radius-lg $radius-lg $radius-sm $radius-lg;
    }
  }
  
  &.assistant {
    margin-right: auto;
    
    .bubble {
      background: $neutral-100;
      color: $neutral-900;
      border-radius: $radius-lg $radius-lg $radius-lg $radius-sm;
    }
  }
  
  .bubble {
    padding: $space-3 $space-4;
    animation: messageSlide 0.3s ease-out;
  }
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## 4. Animation & Motion

### Animation Principles
- **Purpose**: Every animation must have a clear purpose
- **Performance**: Animations must run at 60fps
- **Duration**: Most animations 200-300ms, complex ones up to 500ms
- **Easing**: Use ease-out for most, ease-in-out for continuous

### Standard Animations

```scss
// Fade In
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// Slide Up
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Scale In
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// Loading Pulse
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// Skeleton Loading
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    $neutral-100 0%,
    $neutral-300 50%,
    $neutral-100 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### Micro-interactions

```scss
// Button Hover
.btn {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: $shadow-sm;
  }
}

// Card Hover
.card {
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-lg;
  }
}

// Toggle Switch
.toggle {
  transition: all 0.2s ease;
  
  &.active {
    .slider {
      transform: translateX(24px);
      background: $primary-blue;
    }
  }
}
```

## 5. Iconography

### Icon Principles
- **Style**: Outline icons for UI, filled for emphasis
- **Size**: 16px (small), 20px (default), 24px (large)
- **Color**: Inherit from parent text color
- **Consistency**: Use Lucide React icon set

### Common Icons

```tsx
import {
  MessageSquare,    // Chat
  Calculator,       // Cost calculations
  BarChart3,       // Analytics
  FileText,        // Documents
  Users,           // Employee management
  Settings,        // Configuration
  HelpCircle,      // Help/Support
  CheckCircle,     // Success
  AlertCircle,     // Warning
  XCircle,         // Error
  TrendingUp,      // Positive trend
  TrendingDown,    // Negative trend
  Calendar,        // Dates/Deadlines
  DollarSign,      // Costs/Pricing
  Shield,          // Security/Protection
  Zap,             // Quick/Fast
  Heart,           // Health/Wellness
  Building,        // Company/Employer
  User,            // Individual
  ChevronRight     // Navigation
} from 'lucide-react';
```

## 6. Content Guidelines

### Writing Principles
1. **Clarity First**: Simple words, short sentences
2. **Active Voice**: "You can..." not "It is possible to..."
3. **Positive Framing**: "Save $500" not "Don't lose $500"
4. **Scannable**: Use headers, bullets, bold for emphasis
5. **Conversational**: Write like you speak

### UI Copy Standards

#### Buttons
- **Action-oriented**: "Compare Plans" not "Comparison"
- **Clear outcome**: "Download Report" not "Download"
- **Consistent tense**: Always present tense

#### Error Messages
```
// Good
"We couldn't find that email address. Please check and try again."

// Bad
"Invalid email format detected in system."
```

#### Empty States
```
// Good
"No benefits questions yet! Try asking 'What's my deductible?'"

// Bad
"No data available."
```

#### Loading States
```
// Good
"Finding the best plans for you..."

// Bad
"Loading..."
```

### Benefits-Specific Terminology

#### Always Explain
- **Deductible**: "The amount you pay before insurance starts covering costs"
- **Copay**: "A fixed amount you pay for a covered service"
- **Coinsurance**: "Your share of costs after meeting the deductible"
- **Out-of-pocket maximum**: "The most you'll pay in a year"

#### Simplify Complex Terms
- Use "monthly cost" instead of "premium"
- Use "doctor visit cost" instead of "copayment"
- Use "your share" instead of "coinsurance"

## 7. Responsive Design

### Breakpoints

```scss
// Mobile First Approach
$breakpoint-sm: 640px;   // Small tablets
$breakpoint-md: 768px;   // Tablets
$breakpoint-lg: 1024px;  // Desktop
$breakpoint-xl: 1280px;  // Large desktop
$breakpoint-2xl: 1536px; // Extra large

// Usage
@media (min-width: $breakpoint-md) {
  .container {
    max-width: 768px;
  }
}
```

### Mobile Considerations
- **Touch Targets**: Minimum 44x44px
- **Thumb Zone**: Primary actions in bottom 2/3
- **Swipe Gestures**: For dismissing cards, navigation
- **Reduced Motion**: Respect prefers-reduced-motion

### Layout Patterns

```scss
// Responsive Grid
.grid {
  display: grid;
  gap: $space-4;
  grid-template-columns: 1fr;
  
  @media (min-width: $breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: $breakpoint-lg) {
    grid-template-columns: repeat(3, 1fr);
  }
}

// Responsive Flex
.flex-container {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  
  @media (min-width: $breakpoint-md) {
    flex-direction: row;
  }
}
```

## 8. Accessibility Standards

### Color Contrast
- **Normal Text**: 4.5:1 minimum ratio
- **Large Text**: 3:1 minimum ratio
- **Interactive Elements**: 3:1 minimum ratio
- **Focus Indicators**: Visible with 3:1 ratio

### Keyboard Navigation
```scss
// Focus Styles
:focus-visible {
  outline: 2px solid $primary-blue;
  outline-offset: 2px;
}

// Skip Links
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: $primary-blue;
  color: $white;
  padding: $space-2 $space-4;
  text-decoration: none;
  
  &:focus {
    top: 0;
  }
}
```

### ARIA Labels
```tsx
// Button with context
<button 
  aria-label="Compare Premium PPO and Basic HMO plans"
  onClick={handleCompare}
>
  Compare Plans
</button>

// Loading state
<div 
  role="status" 
  aria-live="polite"
  aria-label="Loading plan comparison"
>
  <Spinner />
</div>
```

## 9. Theme Customization

### White-Label Configuration

```typescript
interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    neutral: Record<number, string>;
  };
  typography: {
    fontFamily: string;
    headingFamily?: string;
  };
  spacing: {
    unit: number;
  };
  borderRadius: {
    base: string;
  };
  logo?: {
    url: string;
    height: number;
  };
}

// Example Client Theme
const clientTheme: ThemeConfig = {
  colors: {
    primary: '#00539F',      // Client's brand blue
    secondary: '#F37021',    // Client's brand orange
    success: '#00A651',
    error: '#DC3545',
    neutral: standardNeutrals
  },
  typography: {
    fontFamily: 'Proxima Nova, sans-serif',
    headingFamily: 'Montserrat, sans-serif'
  },
  spacing: {
    unit: 4
  },
  borderRadius: {
    base: '8px'
  },
  logo: {
    url: '/client-logo.svg',
    height: 40
  }
};
```

### CSS Variables Implementation

```scss
:root {
  // Dynamic theme variables
  --color-primary: #{$primary-blue};
  --color-primary-light: #{$primary-blue-light};
  --color-primary-dark: #{$primary-blue-dark};
  
  --font-family: #{$font-primary};
  --font-size-base: #{$text-base};
  
  --spacing-unit: 0.25rem;
  --radius-base: #{$radius-md};
  
  // Applied in components
  .btn-primary {
    background: var(--color-primary);
    
    &:hover {
      background: var(--color-primary-dark);
    }
  }
}
```

## 10. Design Tokens

### Token Structure

```json
{
  "color": {
    "primary": {
      "value": "#0066CC",
      "type": "color"
    },
    "text": {
      "primary": {
        "value": "#1A1A1A",
        "type": "color"
      },
      "secondary": {
        "value": "#4A4A4A",
        "type": "color"
      }
    }
  },
  "spacing": {
    "xs": {
      "value": "4px",
      "type": "spacing"
    },
    "sm": {
      "value": "8px",
      "type": "spacing"
    }
  },
  "typography": {
    "heading": {
      "h1": {
        "fontSize": {
          "value": "36px",
          "type": "fontSizes"
        },
        "fontWeight": {
          "value": "700",
          "type": "fontWeights"
        }
      }
    }
  }
}
```

### Token Usage

```tsx
// In components
import { tokens } from '@/design-tokens';

const StyledButton = styled.button`
  background: ${tokens.color.primary};
  padding: ${tokens.spacing.sm} ${tokens.spacing.md};
  font-size: ${tokens.typography.body.fontSize};
  border-radius: ${tokens.borderRadius.md};
`;
```

## Implementation Checklist

### Component Creation
- [ ] Follow naming conventions
- [ ] Include all responsive breakpoints
- [ ] Add proper ARIA labels
- [ ] Test with keyboard navigation
- [ ] Verify color contrast
- [ ] Add loading and error states
- [ ] Include animations
- [ ] Document props with TypeScript

### Design Review
- [ ] Consistent spacing
- [ ] Proper typography hierarchy
- [ ] Accessible color usage
- [ ] Smooth animations
- [ ] Mobile-first approach
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Theme compatibility

This style guide ensures consistency across all UI elements while maintaining flexibility for white-label customization and accessibility compliance.