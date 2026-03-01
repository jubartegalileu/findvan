import React from 'react';

const iconPaths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="12" y="3" width="9" height="5" rx="1.5" />
      <rect x="12" y="10" width="9" height="11" rx="1.5" />
      <rect x="3" y="12" width="7" height="9" rx="1.5" />
    </>
  ),
  scraper: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  leads: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M2.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14.5 20a4.5 4.5 0 0 1 9 0" />
    </>
  ),
  sdr: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
    </>
  ),
  funnel: (
    <>
      <path d="M3 4h18l-6 7v6l-6 3v-9L3 4z" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M12 3a9 9 0 0 1 7.8 13.5L21 21l-4.8-1.2A9 9 0 1 1 12 3Z" />
      <path d="M9 8.8c.4-.7.8-.7 1.1-.7.2 0 .4 0 .6.5.2.5.8 1.9.9 2s.1.4 0 .6c-.1.2-.2.4-.4.6-.2.2-.4.4-.1.8.4.7 1.2 1.4 2.1 1.8.5.2.8 0 1-.2.2-.2.5-.6.6-.8.1-.2.3-.2.6-.1.2.1 1.7.8 2 .9.3.1.5.2.6.3.1.1.1.7-.2 1.4-.3.7-1.5 1.3-2.1 1.3s-1.2.2-3.9-.9c-2.8-1.2-4.5-4.1-4.6-4.3-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.4Z" />
    </>
  ),
  campaigns: (
    <>
      <path d="m3 14 8-8 4 4-8 8H3z" />
      <path d="m14 3 2-2 5 5-2 2z" />
      <path d="M12 20h9" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8 14 4l2.4-.3 1 2.2 2 1.2-.6 2.3 1.2 2-1.2 2 .6 2.3-2 1.2-1 2.2-2.4-.3-2 1.2-2-1.2-2.4.3-1-2.2-2-1.2.6-2.3-1.2-2 1.2-2-.6-2.3 2-1.2 1-2.2 2.4.3Z" />
    </>
  ),
  export: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19h16" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0 1.2 4.2" />
      <path d="M21 4v6h-6" />
    </>
  ),
  recent: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </>
  ),
  module: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 20h8" />
    </>
  ),
};

export default function Icon({ name, size = 20, className = '' }) {
  const icon = iconPaths[name] || iconPaths.dashboard;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`fv-icon ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}
