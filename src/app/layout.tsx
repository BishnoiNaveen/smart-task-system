import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTask - Productivity Task & Reminder System",
  description: "A premium dashboard application to organize your tasks, track categories, and schedule reminders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Anti-flash theme check script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', savedTheme);
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
