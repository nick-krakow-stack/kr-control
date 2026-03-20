@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 215 60% 24%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 215 60% 24%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* KR Control Custom Styles */
.sidebar-link {
  @apply flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200;
}

.sidebar-link-active {
  @apply bg-orange-500 text-white shadow-sm;
}

.sidebar-link-inactive {
  @apply text-slate-300 hover:bg-white/10 hover:text-white;
}

.status-badge {
  @apply inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold;
}

.card-stats {
  @apply rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md;
}

/* File Upload Area */
.upload-area {
  @apply relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors;
}

.upload-area-active {
  @apply border-orange-400 bg-orange-50;
}

.upload-area:hover {
  @apply border-slate-400 bg-slate-100;
}

/* Autocomplete Dropdown */
.autocomplete-dropdown {
  @apply absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg;
}

.autocomplete-item {
  @apply flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50;
}

.autocomplete-item:first-child {
  @apply rounded-t-lg;
}

.autocomplete-item:last-child {
  @apply rounded-b-lg;
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .form-grid {
    @apply grid-cols-1;
  }
}

/* Print Styles */
@media print {
  .sidebar,
  .no-print {
    display: none !important;
  }
  
  .print-full {
    width: 100% !important;
  }
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
