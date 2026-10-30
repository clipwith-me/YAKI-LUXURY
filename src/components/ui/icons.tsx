import type { SVGProps } from "react";

// Single-weight line icons (1.5px stroke) drawn for this product — consistent and dependency-free.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props };
}

export const Icon = {
  Bed: (p: IconProps) => (<svg {...base(p)}><path d="M3 18V7M21 18v-5a3 3 0 0 0-3-3H10v8M3 14h18M6.5 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>),
  Bath: (p: IconProps) => (<svg {...base(p)}><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3ZM6 12V6a2 2 0 0 1 3.5-1.3M7 19l-1 2M17 19l1 2" /></svg>),
  Area: (p: IconProps) => (<svg {...base(p)}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>),
  Pin: (p: IconProps) => (<svg {...base(p)}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>),
  Heart: ({ filled, ...p }: IconProps & { filled?: boolean }) => (<svg {...base(p)} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>),
  Share: (p: IconProps) => (<svg {...base(p)}><path d="M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>),
  Shield: (p: IconProps) => (<svg {...base(p)}><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>),
  Search: (p: IconProps) => (<svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>),
  Sparkle: (p: IconProps) => (<svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>),
  Arrow: (p: IconProps) => (<svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
  ArrowLeft: (p: IconProps) => (<svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>),
  Chevron: (p: IconProps) => (<svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>),
  ChevronDown: (p: IconProps) => (<svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>),
  Menu: (p: IconProps) => (<svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h10" /></svg>),
  Close: (p: IconProps) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>),
  Map: (p: IconProps) => (<svg {...base(p)}><path d="m9 4-6 2.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4ZM9 4v13.5M15 6.5V20" /></svg>),
  Grid: (p: IconProps) => (<svg {...base(p)}><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /></svg>),
  List: (p: IconProps) => (<svg {...base(p)}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>),
  Phone: (p: IconProps) => (<svg {...base(p)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>),
  Mail: (p: IconProps) => (<svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 7 9 6 9-6" /></svg>),
  Calendar: (p: IconProps) => (<svg {...base(p)}><rect x="4" y="5" width="16" height="16" rx="1" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>),
  Compare: (p: IconProps) => (<svg {...base(p)}><path d="M8 3v18M16 3v18M3 8h5M16 16h5M3 16h5M16 8h5" /></svg>),
  Bell: (p: IconProps) => (<svg {...base(p)}><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0" /></svg>),
  User: (p: IconProps) => (<svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>),
  Building: (p: IconProps) => (<svg {...base(p)}><path d="M4 21V5l8-2v18M12 8h8v13M8 8h.01M8 12h.01M8 16h.01M16 12h.01M16 16h.01M2 21h20" /></svg>),
  Key: (p: IconProps) => (<svg {...base(p)}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M15 8l2 2" /></svg>),
  Home: (p: IconProps) => (<svg {...base(p)}><path d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" /></svg>),
  Doc: (p: IconProps) => (<svg {...base(p)}><path d="M7 3h7l5 5v13H7V3Z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>),
  Chart: (p: IconProps) => (<svg {...base(p)}><path d="M4 20h16M7 16v-4M12 16V8M17 16v-7" /></svg>),
  Coins: (p: IconProps) => (<svg {...base(p)}><ellipse cx="9" cy="7" rx="5" ry="2.5" /><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7M10 16.5c.6.6 2 1 4 1 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5" /></svg>),
  Flag: (p: IconProps) => (<svg {...base(p)}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>),
  Settings: (p: IconProps) => (<svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" /></svg>),
  Check: (p: IconProps) => (<svg {...base(p)}><path d="m5 12 5 5 9-10" /></svg>),
  Info: (p: IconProps) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>),
  Play: (p: IconProps) => (<svg {...base(p)}><path d="M7 4v16l13-8L7 4Z" /></svg>),
  Plan: (p: IconProps) => (<svg {...base(p)}><path d="M3 3h18v18H3zM3 12h8M11 3v6M11 15v6M16 12h5" /></svg>),
  Logout: (p: IconProps) => (<svg {...base(p)}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>),
  WhatsApp: ({ size = 18, ...p }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  ),
};
