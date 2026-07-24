import { useEffect, useRef, useState } from 'react';

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (parent: HTMLElement, options: { theme: 'outline'; size: 'large'; text: 'continue_with'; shape: 'pill'; width: number }) => void;
        };
      };
    };
  }
}

type ViteImportMeta = ImportMeta & { env: Record<string, string | undefined> };

const GOOGLE_CLIENT_ID = (import.meta as ViteImportMeta).env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_ID = 'google-identity-services';

export default function GoogleSignIn({ onSuccess, disabled = false }: { onSuccess: (credential: string) => void; disabled?: boolean }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return;
    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential && !disabled) onSuccess(response.credential);
        },
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: Math.max(250, Math.floor(buttonRef.current.clientWidth)),
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (window.google?.accounts?.id) renderGoogleButton();
    else if (existingScript) existingScript.addEventListener('load', renderGoogleButton, { once: true });
    else {
      const script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderGoogleButton, { once: true });
      document.head.appendChild(script);
    }

    return () => { cancelled = true; };
  }, [disabled, onSuccess]);

  if (!GOOGLE_CLIENT_ID) {
    return <div className="google-auth">
      <button type="button" className="google-auth-button" disabled={disabled} onClick={() => setMessage('Add both VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to .env, then restart the server to enable verified Google sign-in.')}>
        <span className="google-auth-glyph" aria-hidden="true">G</span>Continue with Google
      </button>
      {message && <p className="google-auth-message" role="status">{message}</p>}
    </div>;
  }

  return <div className="google-auth"><div ref={buttonRef} className="google-auth-google-button" aria-label="Continue with Google" /></div>;
}
