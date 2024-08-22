import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [projectReference, setProjectReference] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [isAccessKeyEnabled, setIsAccessKeyEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleRunChecks = async () => {
    if (!projectReference) {
      setError("Project Reference is required.");
      setApiResponse(null); // Clear previous response
      return;
    }
  
    setLoading(true);
    setError(null); // Clear any previous errors
    setApiResponse(null); // Clear previous response
  
    try {
      const response = await axios.post(
        `http://localhost:3001/checks/run-system-checks/${projectReference}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': isAccessKeyEnabled ? `Bearer ${accessKey}` : undefined
          }
        }
      );
      setApiResponse(response.data);
    } catch (error) {
      // Handle error and set the error state with the message
      setError(error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };
  

  const renderMfaData = () => {
    if (!apiResponse) return null;
    const { mfaStatus, resolution, link } = apiResponse.mfaData;

    return (
      <div style={styles.dataSection}>
        <h3>MFA Data:</h3>
        {mfaStatus.map((status, index) => (
          <div key={index} style={styles.dataItem}>
            <p>User ID: {status.userId}</p>
            <p>MFA Status: {status.mfaStatus ? 'Enabled' : 'Disabled'}</p>
          </div>
        ))}
        <p style={styles.resolution}>Resolution: {resolution}</p>
        <a href={link} target="_blank" rel="noopener noreferrer" style={styles.link}>Learn more</a>
      </div>
    );
  };

  const renderPitrData = () => {
    if (!apiResponse) return null;
    const { pitrStatus, resolution, link } = apiResponse.pitrData;

    return (
      <div style={styles.dataSection}>
        <h3>PITR Data:</h3>
        <p>PITR Status: {pitrStatus ? 'Enabled' : 'Disabled'}</p>
        <p style={styles.resolution}>Resolution: {resolution}</p>
        <a href={link} target="_blank" rel="noopener noreferrer" style={styles.link}>Learn more</a>
      </div>
    );
  };

  const renderRlsData = () => {
    if (!apiResponse) return null;
    const { rlsStatus } = apiResponse.rlsData;

    if (rlsStatus.length === 0) {
      return (
        <div style={styles.dataSection}>
          <h3>RLS Data:</h3>
          <p>All tables have RLS enabled.</p>
        </div>
      );
    }

    return (
      <div style={styles.dataSection}>
        <h3>RLS Data:</h3>
        {rlsStatus.map((status, index) => (
          <div key={index} style={styles.dataItem}>
            <p>Table Name: {status.tableName}</p>
            <p>RLS Status: {status.rlsStatus ? 'Enabled' : 'Disabled'}</p>
            <p style={styles.resolution}>Resolution: {status.resolution}</p>
            <pre style={styles.command}>{status.command}</pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>System Checks</h1>
      <div style={styles.inputGroup}>
        <label style={styles.label}>
          Project Reference:
          <input
            type="text"
            value={projectReference}
            onChange={(e) => setProjectReference(e.target.value)}
            style={styles.input}
          />
        </label>
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>
          Access Key:
          <div style={styles.accessKeyContainer}>
            <input
              type={showAccessKey ? 'text' : 'password'}
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              disabled={!isAccessKeyEnabled}
              style={styles.input}
            />
            <span style={styles.tooltip}>
              If you have previously checked for this project using the same access key, you do not need to enter it again.
            </span>
          </div>
        </label>
        <div style={styles.checkboxContainer}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showAccessKey}
              onChange={() => setShowAccessKey(!showAccessKey)}
              style={styles.checkbox}
            />
            Show Access Key
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isAccessKeyEnabled}
              onChange={() => setIsAccessKeyEnabled(!isAccessKeyEnabled)}
              style={styles.checkbox}
            />
            Enable Access Key
          </label>
        </div>
      </div>
      <button
        onClick={handleRunChecks}
        style={styles.button}
      >
        Run Checks
      </button>
      {loading && <div style={styles.loader}>Loading...</div>}
      {error && <div style={styles.error}>{error}</div>}
      {apiResponse && (
        <div style={styles.responseContainer}>
          {renderMfaData()}
          {renderPitrData()}
          {renderRlsData()}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '400px',
    margin: '50px auto',
    backgroundColor: '#f7f7f7',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#333',
  },
  inputGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  checkboxContainer: {
    marginTop: '10px',
  },
  checkboxLabel: {
    color: '#555',
  },
  checkbox: {
    marginRight: '5px',
  },
  button: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
  },
  loader: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#007bff',
    fontSize: '18px',
  },
  error: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#d9534f',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  responseContainer: {
    marginTop: '20px',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '4px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  },
  dataSection: {
    marginBottom: '20px',
  },
  dataItem: {
    backgroundColor: '#f9f9f9',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  resolution: {
    fontWeight: 'bold',
    color: '#d9534f',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
  },
  command: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
};

export default App;