import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import AuthProvider from "./providers/Auth0Providers";
import ShortcutProvider from "./providers/ShortcutProvider";
import Threads from "~/components/ui/Threads";
import type { Route } from "./+types/root";
import "./app.css";
import "@fontsource/inter";
import { ToastProvider } from "~/components/ui/toast";

export const links: Route.LinksFunction = () => [
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
];

// app/root.tsx - REPLACE the meta export with this SEO-optimized version

export const meta: Route.MetaFunction = () => {
  return [
    // Primary Meta Tags
    { 
      title: "SkyGPT (Beta) - Free AI Chat with Claude, ChatGPT, Gemini & More | Best AI Assistant" 
    },
    { 
      name: "description", 
      content: "Access Claude, ChatGPT, Gemini, Llama 4, Grok 4 & 10+ AI models in one platform. Free AI chat, code generation, multilingual support. Better than ChatGPT alternatives." 
    },
    
    // Keywords (still useful for some search engines)
    { 
      name: "keywords", 
      content: "ChatGPT alternative, Claude AI, Gemini AI, free AI chat, AI assistant, chatbot, artificial intelligence, GPT-4, Llama 4, Grok AI, AI coding assistant, multilingual AI, best AI chatbot, ChatGPT free, AI text generator, AI writer, conversational AI, OpenAI alternative" 
    },
    
    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:title", content: "SkyGPT - Free AI Chat Alternative to ChatGPT & Claude" },
    { 
      property: "og:description", 
      content: "Access 10+ AI models including Claude, Gemini, Llama 4, Grok 4. Free AI chat with code generation, multilingual support & more." 
    },
    { property: "og:url", content: "https://s-ai-blush.verce.app" },
    { property: "og:image", content: "https://s-ai-blush.verce.app/og-image.png" },
    { property: "og:site_name", content: "SkyGPT" },
    
    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "SkyGPT - Best Free Alternative to ChatGPT & Claude AI" },
    { 
      name: "twitter:description", 
      content: "Free AI chat with 10+ models. Better than ChatGPT, Claude, and Gemini. Try now!" 
    },
    { name: "twitter:image", content: "https://s-ai-blush.verce.app/twitter-card.png" },
    
    // Additional SEO Tags
    { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    { name: "googlebot", content: "index, follow" },
    { name: "author", content: "SkyGPT" },
    { name: "language", content: "English" },
    { name: "revisit-after", content: "7 days" },
    
    // Mobile Optimization
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
    { name: "theme-color", content: "#0f0f0f" },
    
    // Schema.org for Google+ (JSON-LD will be added separately)
    { itemProp: "name", content: "SkyGPT - Free AI Chat Platform" },
    { itemProp: "description", content: "Access multiple AI models in one platform" },
    
    // Canonical URL
    { tagName: "link", rel: "canonical", href: "https://s-ai-blush.verce.app" },
  ];
};

// Add this to the <head> section in your Layout component
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        
        {/* JSON-LD Structured Data for Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "SkyGPT",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "description": "AI-powered chat platform with access to Claude, ChatGPT, Gemini, Llama 4, and more",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1250"
              },
              "featureList": [
                "Multiple AI Models",
                "Free Chat",
                "Code Generation",
                "Multilingual Support",
                "Document Analysis"
              ]
            })
          }}
        />
        
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "SkyGPT",
              "url": "https://s-ai-blush.verce.app",
              "logo": "https://s-ai-blush.verce.app/logo.png",
              "sameAs": [
                "https://twitter.com/skygpt",
                "https://linkedin.com/company/skygpt"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "support@skygpt.com",
                "contactType": "Customer Support"
              }
            })
          }}
        />
        
        {/* FAQ Schema for rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Is SkyGPT better than ChatGPT?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "SkyGPT gives you access to multiple AI models including Claude, ChatGPT, Gemini, and more in one platform. You can choose the best model for each task."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is SkyGPT free?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! SkyGPT offers a free plan with 25 messages per day and access to basic AI models."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What AI models does SkyGPT support?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "SkyGPT supports 10+ AI models including Llama 4, Gemini 2.5, Grok 4, DeepSeek, Qwen 3, and more."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className=" selection:bg-purple-500 selection:text-white min-h-screen relative overflow-x-hidden">
        {/* Background threads */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'inherit'
        }}>
          
        </div>
        
        {/* Content layer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
        
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Updated App component
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ShortcutProvider>
          <Outlet/>
        </ShortcutProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto text-white">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto bg-[#0F0F0F] border border-white/10 rounded-lg">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}