'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f8f8fa',
          color: '#1a1d29',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Erreur inattendue</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: '#64697a' }}>
            L&apos;application a rencontré un problème. Tu peux réessayer.
          </p>
          {error.digest && (
            <p style={{ marginTop: 8, fontSize: 12, fontStyle: 'italic', color: '#8a8fa1' }}>
              Code : {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 6,
              border: 'none',
              background: '#2d3250',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
