/**
 * ZGT Design System - Tactical Glassmorphism
 */

export const designTokens = {
  glass: {
    light: 'rgba(255, 255, 255, 0.7)',
    medium: 'rgba(255, 255, 255, 0.5)',
    tactical: 'rgba(15, 23, 42, 0.6)',
  },
  blur: {
    md: 'blur(16px)',
    lg: 'blur(24px)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  shadows: {
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    elevated: '0 20px 60px -15px rgba(0, 0, 0, 0.3)',
  },
} as const;