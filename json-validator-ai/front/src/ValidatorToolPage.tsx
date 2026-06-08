import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ARTIFACT_TYPES = ['schema', 'ai_prompt', 'starlark'];

const ValidatorToolPage: React.FC = () => {
  const location = useLocation();

  // Initialize state with values from location.state if available
  const [description, setDescription] = useState<string>(location.state?.description || '');
  const [exampleDataList, setExampleDataList] = useState<string>(location.state?.exampleDataList || '[]');
  const [artifactType, setArtifactType] = useState<string>(location.state?.artifactType || ARTIFACT_TYPES[0]);
  const [generatedArtifact, setGeneratedArtifact] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState<boolean>(false);
  const [copySuccessMessage, setCopySuccessMessage] = useState<string>(''); // For copy feedback

  // State for Validation
  const [jsonDataToValidate, setJsonDataToValidate] = useState<string>(location.state?.jsonDataToValidate || '{}');
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoadingValidation, setIsLoadingValidation] = useState<boolean>(false);

  const handleGenerateArtifact = async () => {
    setIsLoadingGeneration(true);
    setGenerationError(null);
    setGeneratedArtifact(null); // Clear previous artifact
    try {
      let parsedExampleData;
      try {
        parsedExampleData = JSON.parse(exampleDataList);
      } catch {
        throw new Error('Example Data List is not valid JSON.');
      }

      const response = await fetch('/api/generate_artifact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          example_data_list: parsedExampleData,
          artifact_type: artifactType,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate artifact');
      }
      const rawArtifactString = result.artifact;
      try {
        const parsedArtifact = JSON.parse(rawArtifactString);
        setGeneratedArtifact(JSON.stringify(parsedArtifact, null, 2));
      } catch (e) {
        console.error("Failed to parse the main artifact string. Displaying as raw string:", e);
        setGeneratedArtifact(rawArtifactString); // Fallback to raw string if main parsing fails
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setGenerationError(error.message);
      } else {
        setGenerationError('An unknown error occurred during generation.');
      }
    }
    setIsLoadingGeneration(false);
  };

  const handleCopyArtifact = async () => {
    if (!generatedArtifact) return;
    // generatedArtifact is now always a pretty-printed JSON string of the full artifact.
    try {
      await navigator.clipboard.writeText(generatedArtifact);
      setCopySuccessMessage('Copied to clipboard!');
      setTimeout(() => setCopySuccessMessage(''), 2000); // Clear message after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopySuccessMessage('Failed to copy!');
      setTimeout(() => setCopySuccessMessage(''), 2000);
    }
  };

  const handleValidateArtifact = async () => {
    if (!generatedArtifact) {
      setValidationError('Please generate an artifact first.');
      return;
    }
    setIsLoadingValidation(true);
    setValidationError(null);
    try {
      let parsedJsonData;
      try {
        parsedJsonData = JSON.parse(jsonDataToValidate);
      } catch {
        throw new Error('JSON Data to Validate is not valid JSON.');
      }

      const response = await fetch('/api/validate_artifact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json_data: parsedJsonData,
          artifact: generatedArtifact,
        }),
      });

      const result = await response.json();

      if (!response.ok) { // Success might be true even if validation fails, check HTTP status
        throw new Error(result.message || result.error || 'Failed to validate artifact');
      }
      setValidationResult(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setValidationError(error.message);
      } else {
        setValidationError('An unknown error occurred during validation.');
      }
    }
    setIsLoadingValidation(false);
  };

  const getLanguageForArtifact = () => {
    // The generatedArtifact state now always holds a stringified JSON object
    // representing the full artifact structure, so the language for highlighting is always JSON.
    return 'json';
  };

  return (
    <div className="p-6 md:p-10 space-y-10 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold text-center text-blue-400">OmniValidator Tool</h1>

      {/* Generation Section */}
      <section className="p-8 bg-gray-800 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold mb-6 text-blue-300">Generate Artifact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col">
            <label htmlFor="description" className="text-sm font-medium text-gray-300 mb-2">Description:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
              placeholder="Enter a description for the artifact..."
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="exampleDataList" className="text-sm font-medium text-gray-300 mb-2">Example Data List (JSON format):</label>
            <textarea
              id="exampleDataList"
              value={exampleDataList}
              onChange={(e) => setExampleDataList(e.target.value)}
              rows={5}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 font-mono"
              placeholder='[{"key": "value"}, {"key2": "value2"}]'
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col">
          <label htmlFor="artifactType" className="text-sm font-medium text-gray-300 mb-2">Artifact Type:</label>
          <select
            id="artifactType"
            value={artifactType}
            onChange={(e) => setArtifactType(e.target.value)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
          >
            {ARTIFACT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerateArtifact}
          disabled={isLoadingGeneration}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
        >
          {isLoadingGeneration ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Generate Artifact'}
        </button>
        {generationError && <p className="mt-3 text-red-400 text-sm">Error: {generationError}</p>}
        {generatedArtifact && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-green-300">Generated {artifactType.toUpperCase()} Artifact:</h3>
              <button
                onClick={handleCopyArtifact}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-3 rounded-md transition duration-150 ease-in-out"
              >
                Copy
              </button>
            </div>
            {copySuccessMessage && (
              <p className={`text-xs mb-2 ${copySuccessMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                {copySuccessMessage}
              </p>
            )}
            <div className="max-h-96 overflow-y-auto">
              <SyntaxHighlighter
                language={getLanguageForArtifact()}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '0.5em', background: 'transparent' }}
                wrapLines={true}
                showLineNumbers={true}
              >
                {artifactType === 'schema' && generatedArtifact
                  ? JSON.stringify(JSON.parse(generatedArtifact), null, 2)
                  : generatedArtifact}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </section>

      {/* Validation Section */}
      <section className="p-8 bg-gray-800 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold mb-6 text-green-300">Validate Artifact</h2>
        <div className="flex flex-col">
          <label htmlFor="jsonDataToValidate" className="text-sm font-medium text-gray-300 mb-2">JSON Data to Validate:</label>
          <textarea
            id="jsonDataToValidate"
            value={jsonDataToValidate}
            onChange={(e) => setJsonDataToValidate(e.target.value)}
            rows={5}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400 font-mono"
            placeholder='{"key": "data_to_validate"}'
          />
        </div>
        <button
          onClick={handleValidateArtifact}
          disabled={!generatedArtifact || isLoadingValidation}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center"
        >
          {isLoadingValidation ? (
             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Validate Artifact'}
        </button>
        {validationError && <p className="mt-3 text-red-400 text-sm">Error: {validationError}</p>}
        {validationResult && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2 text-green-200">Validation Result:</h3>
            <div className="bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white font-mono text-sm overflow-auto">
              <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1em', background: 'transparent' }} wrapLines={true} showLineNumbers={true}>
                {JSON.stringify(validationResult, null, 2)}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ValidatorToolPage;
