import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // For embedded apps, redirect to /app (which will handle install flow)
  // Shopify App Bridge will handle authentication
  const isEmbedded = url.searchParams.get("embedded") === "1";
  const hasHost = url.searchParams.get("host");
  const hasShop = url.searchParams.get("shop");
  
  if (isEmbedded || hasHost || hasShop) {
    // Redirect to /app, not /app/chat
    // app._index will check if shop exists and redirect accordingly
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // For non-embedded access, show landing page without login form
  return { showForm: false };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>🤖 IconTrans AI Translation Assistant</h1>
        <p className={styles.text}>
          Chat with AI to translate your Shopify store into 100+ languages. Powered by GPT-4 and Gemini.
        </p>
        
        {!showForm && (
          <div style={{ 
            padding: '2rem', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '12px',
            marginTop: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 600 }}>
              💬 Start Chatting with AI Assistant
            </h2>
            <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem', opacity: 0.9 }}>
              Access the app from your Shopify Admin to start translating with AI
            </p>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginTop: '1.5rem'
            }}>
              <ol style={{ 
                textAlign: 'left', 
                marginLeft: '1.5rem', 
                lineHeight: '2',
                fontSize: '1rem'
              }}>
                <li>Go to <strong>Shopify Admin</strong></li>
                <li>Click <strong>Apps</strong> in the sidebar</li>
                <li>Select <strong>IconTrans</strong></li>
                <li>🎉 Start chatting with AI!</li>
              </ol>
            </div>
          </div>
        )}

        <ul className={styles.list}>
          <li>
            <strong>🤖 AI-Powered Chat Interface</strong>. Natural language commands like "Translate collection 'Summer 2026' to French" - AI does the rest!
          </li>
          <li>
            <strong>🌍 100+ Languages</strong>. Automatic translation using GPT-4, Gemini, and Google Translate with glossary support.
          </li>
          <li>
            <strong>⚡ Smart Sync</strong>. Real-time product and collection syncing with automatic change detection.
          </li>
          <li>
            <strong>💎 Token-Based Pricing</strong>. Pay only for what you use. No monthly limits or hidden fees.
          </li>
        </ul>
      </div>
    </div>
  );
}
