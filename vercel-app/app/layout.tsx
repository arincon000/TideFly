import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "TideFly",
  description: "Surf + flight alerts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_TP_VERIFY === "true" && (
          <Script
            id="tp-verify"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(){var script=document.createElement("script");script.async=1;script.src='https://emrld.ltd/NDU2MzAx.js?t=456301';document.head.appendChild(script);})();`,
            }}
          />
        )}
      </head>
      <body className="min-h-screen bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
