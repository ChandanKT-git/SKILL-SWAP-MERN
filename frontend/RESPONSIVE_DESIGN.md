# Responsive Design & Accessibility Guide

## Overview
This document outlines the responsive design and accessibility features implemented in the SkillSwap application.

## Responsive Breakpoints

We use Tailwind CSS's default breakpoints:
- `sm`: 640px - Small devices (landscape phones)
- `md`: 768px - Medium devices (tablets)
- `lg`: 1024px - Large devices (desktops)
- `xl`: 1280px - Extra large devices (large desktops)
- `2xl`: 1536px - 2X large devices (larger desktops)

## Mobile-First Approach

All components are built mobile-first, meaning:
1. Base styles apply to mobile devices
2. Responsive modifiers (`sm:`, `md:`, etc.) add styles for larger screens
3. Touch targets are minimum 44x44px (iOS) or 48x48px (Android)

## Accessibility Features

### 1. Semantic HTML
- Proper use of landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`, `<article>`
- Heading hierarchy (h1 → h2 → h3)
- Semantic form elements with labels

### 2. ARIA Attributes
- `aria-label` for icon-only buttons
- `aria-describedby` for form field descriptions and errors
- `aria-invalid` for form validation states
- `aria-expanded` for expandable elements
- `aria-live` for dynamic content updates
- `aria-hidden` for decorative elements

### 3. Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus visible styles (ring-2 classes)
- Skip to main content link
- Proper tab order
- Escape key to close modals/dropdowns

### 4. Screen Reader Support
- `.sr-only` class for screen reader only content
- Descriptive labels for all form inputs
- Alternative text for images (or empty alt for decorative)
- Status announcements for dynamic updates

### 5. Color Contrast
- All text meets WCAG AA standards (4.5:1 for normal text)
- Focus indicators have sufficient contrast
- Error states use both color and text

### 6. Touch Interactions
- `touch-manipulation` CSS for better touch response
- Minimum 44x44px touch targets
- Active states for visual feedback
- Swipe-friendly layouts on mobile

## Component-Specific Features

### Header
- Sticky positioning for easy access
- Mobile hamburger menu
- Skip to main content link
- Responsive navigation collapse

### Buttons
- Minimum height based on size
- Loading states with aria-busy
- Active states for touch feedback
- Focus visible rings

### Forms
- Associated labels with inputs
- Error messages linked via aria-describedby
- Required field indicators
- Helper text support
- Touch-friendly input sizes on mobile

### Search
- Combobox pattern for autocomplete
- Keyboard navigation (arrows, enter, escape)
- Screen reader announcements
- Clear button with accessible label

### Cards
- Responsive grid layouts
- Touch-friendly spacing
- Semantic article elements
- Accessible action buttons

## Testing Checklist

### Responsive Testing
- [ ] Test on mobile (320px - 480px)
- [ ] Test on tablet (768px - 1024px)
- [ ] Test on desktop (1280px+)
- [ ] Test landscape and portrait orientations
- [ ] Verify touch targets are adequate
- [ ] Check text readability at all sizes

### Accessibility Testing
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators are visible
- [ ] Forms have proper labels and error handling
- [ ] Images have appropriate alt text
- [ ] Headings follow proper hierarchy

### Browser Testing
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (iOS and macOS)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Tools & Resources

### Testing Tools
- Chrome DevTools Device Mode
- Lighthouse Accessibility Audit
- axe DevTools browser extension
- WAVE browser extension
- Screen readers (NVDA, JAWS, VoiceOver)

### Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

## Common Patterns

### Responsive Text
```jsx
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
  Responsive Heading
</h1>
```

### Responsive Layout
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Accessible Button
```jsx
<button
  type="button"
  aria-label="Close dialog"
  className="focus:outline-none focus:ring-2 focus:ring-primary-500"
>
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

### Accessible Form Field
```jsx
<Input
  label="Email"
  type="email"
  required
  error={errors.email}
  helperText="We'll never share your email"
  aria-describedby="email-error email-helper"
/>
```

## Future Improvements

1. Add reduced motion support (`prefers-reduced-motion`)
2. Implement dark mode with proper contrast
3. Add internationalization (i18n) support
4. Enhance keyboard shortcuts
5. Add more comprehensive ARIA live regions
6. Implement focus trap for modals
7. Add high contrast mode support
