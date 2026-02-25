# MediCare Hospital & EMR Platform

A comprehensive, modern hospital website and Electronic Medical Records (EMR) platform built with HTML5, CSS3, JavaScript, Bootstrap 5, Font Awesome, and AOS (Animate On Scroll).

## Features

### Public Website
- **Homepage** - Hero section, quick appointment booking, featured departments, patient testimonials, emergency banner
- **About** - Mission, vision, values, hospital statistics, medical leadership, certifications
- **Services** - Department overview and detailed service pages (e.g., Cardiology with FAQs, diagnostic packages)

### EMR Dashboards
- **Patient Portal** - Health overview, medical history timeline, lab results, appointments, medications
- **Staff Dashboard** - Patient management, bed allocation, lab orders, quick actions, real-time alerts

## Tech Stack

- HTML5
- CSS3 (Custom properties, Flexbox, Grid)
- JavaScript (ES6+)
- Bootstrap 5.3
- Font Awesome 6.4
- AOS (Animate On Scroll)

## Design System

### Brand Colors
- **Primary Teal** `#0ABAB5` - CTAs, buttons, highlights
- **Secondary Teal** `#026873` - Navigation, headers
- **Accent Yellow** `#FFC145` - Warm care, emphasis
- **Soft White** `#F3FDFC` - Backgrounds

### Getting Started

1. Open `index.html` in a browser, or
2. Serve the project with a local server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```

## File Structure

```
hospital/
├── index.html              # Homepage
├── about.html              # About page
├── services.html           # Services overview
├── emr-patient-dashboard.html
├── admin-dashboard.html
├── css/
│   └── styles.css          # Design system & components
├── js/
│   └── main.js             # Testimonials, smooth scroll
├── services/
│   └── cardiology.html     # Cardiology service detail
└── README.md
```

## Accessibility

- Semantic HTML5 markup
- ARIA labels where appropriate
- Keyboard navigation support
- WCAG 2.1 AA color contrast

## Browser Support

Chrome, Firefox, Safari, Edge (latest versions)
