import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { artifactCases } from './artifact-cases';
import type { ArtifactCase } from './artifact-cases';
const ExamplesPage: React.FC = () => {
  const navigate = useNavigate();

  const handleUseArtifactCase = (artifactCase: ArtifactCase) => {
    let jsonDataForValidation = '{}'; // Default for the validation input field
    try {
      const parsedExampleDataArray = JSON.parse(artifactCase.exampleData);
      if (Array.isArray(parsedExampleDataArray) && parsedExampleDataArray.length > 0) {
        // Pretty-stringify the first element of the array for the validation field
        jsonDataForValidation = JSON.stringify(parsedExampleDataArray[0], null, 2);
      } else if (typeof parsedExampleDataArray === 'object' && parsedExampleDataArray !== null && !Array.isArray(parsedExampleDataArray)) {
        // If exampleData was a single object (not an array), use it directly
        jsonDataForValidation = JSON.stringify(parsedExampleDataArray, null, 2);
      } else {
        // Fallback if it's not a non-empty array or a single object (e.g., empty array, primitive, or unparseable)
        console.warn('Example data for artifact case is not a non-empty array or single object. Defaulting validation data to {}. Original exampleData:', artifactCase.exampleData);
      }
    } catch (e) {
      console.error('Failed to parse artifactCase.exampleData for pre-filling validation input:', e);
      // If parsing fails, jsonDataForValidation remains '{}'
      // Alternatively, could use artifactCase.exampleData directly if it might be a single, non-array JSON object string
      // but the expectation is that exampleData is a stringified array for generation.
    }

    navigate('/', {
      state: {
        description: artifactCase.description,
        exampleDataList: artifactCase.exampleData, // This is for the 'Example Data List for Generation' field
        artifactType: artifactCase.artifactType,
        jsonDataToValidate: jsonDataForValidation,    // This is for the 'JSON Data to Validate' field
      },
    });
  };

  return (
    <div className="p-6 md:p-10 space-y-10 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold text-center text-purple-400">Example Cases & Datasets</h1>

      <nav className="mb-10 text-center">
        <Link to="/" className="text-blue-300 hover:text-blue-400 underline text-lg">
          &larr; Back to Validator Tool
        </Link>
      </nav>

      {/* Artifact Generation Examples Section */}
      <section className="p-8 bg-gray-800 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold mb-6 text-purple-300">Artifact Generation Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {artifactCases.map((ac) => (
            <div key={ac.id} className="bg-gray-750 p-6 rounded-lg shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-semibold text-purple-200 mb-2">{ac.title}</h3>
                <p className="text-sm text-gray-300 mb-3 whitespace-pre-line">{ac.description}</p>
                <p className="text-xs text-gray-400 mb-1"><strong>Artifact Type:</strong> {ac.artifactType}</p>
                <details className="mb-3">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-200">View Example Data (for generation)</summary>
                  <div className="mt-2 p-2 bg-gray-850 rounded max-h-200 overflow-y-auto">
                    <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, padding: '0.5em', background: 'transparent' }} wrapLines={true} showLineNumbers={false}>
                      {ac.exampleData}
                    </SyntaxHighlighter>
                  </div>
                </details>
              </div>
              <button
                onClick={() => handleUseArtifactCase(ac)}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out"
              >
                Use this Case
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ExamplesPage;
