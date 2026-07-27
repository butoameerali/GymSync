import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '20px',
          textAlign: 'center',
          color: 'var(--text-primary, #fff)'
        }}>
          <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', borderRadius: '16px' }}>
            <h2 style={{ marginBottom: '16px', color: '#ef4444' }}>Oops! Something went wrong</h2>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '24px' }}>
              An unexpected error occurred in this application module. Don't worry, your data is safe.
            </p>
            <button 
              className="btn btn-primary"
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'var(--primary-accent, #3b82f6)',
                color: '#fff',
                border: 'none',
                fontWeight: '600'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
