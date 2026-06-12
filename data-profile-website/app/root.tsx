import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from "@remix-run/react";
import { useEffect } from "react";

import type { LinksFunction } from "@remix-run/node";
import { initGA } from "./utils/track";

import appStylesHref from "./tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: appStylesHref },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigation = useNavigation();

  return (
    <html lang="en" className={navigation.state === "loading" ? "loading" : ""}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <title>codatta platform</title>
        <Meta />
        <Links />
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${
            import.meta.env.VITE_GA_TRACKING_ID
          }`}
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${import.meta.env.VITE_GA_TRACKING_ID}');
          `,
          }}
        ></script>
      </head>
      <body className="font-inter">
        {children}
        <ScrollRestoration getKey={(location) => location.pathname} />
        <Scripts />$
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    initGA();
  }, []);
  useEffect(() => {
    const removeDollarSign = () => {
      document.querySelectorAll("body > script").forEach((script) => {
        if (
          script.nextSibling &&
          script.nextSibling.nodeType === Node.TEXT_NODE
        ) {
          const textNode = script.nextSibling;
          if (textNode.nodeValue?.trim() === "$") {
            textNode.remove();
          }
        }
      });
    };

    removeDollarSign();
  }, []);

  return <Outlet />;
}
