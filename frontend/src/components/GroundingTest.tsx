interface GroundingTestProps {
  rawGeminiResult: any;
}

export function GroundingTest({ rawGeminiResult }: GroundingTestProps) {
  if (!rawGeminiResult?.response?.candidates?.[0]?.groundingMetadata) {
    return <div className="p-4 bg-gray-100 rounded">No grounding metadata available</div>;
  }

  const groundingMetadata = rawGeminiResult.response.candidates[0].groundingMetadata;

  return (
    <div className="p-4 bg-white border rounded-lg shadow space-y-4">
      <h3 className="text-lg font-semibold">Grounding Test Display</h3>
      
      {/* Search Entry Point */}
      {groundingMetadata.searchEntryPoint?.renderedContent && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Search Entry Point:</h4>
          <div 
            className="border rounded p-2"
            dangerouslySetInnerHTML={{ __html: groundingMetadata.searchEntryPoint.renderedContent }}
          />
        </div>
      )}

      {/* Search Queries */}
      {groundingMetadata.webSearchQueries && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Search Queries:</h4>
          <div className="flex flex-wrap gap-2">
            {groundingMetadata.webSearchQueries.map((query: string, index: number) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {query}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source Links */}
      {groundingMetadata.groundingChunks && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Sources ({groundingMetadata.groundingChunks.length}):</h4>
          <div className="space-y-1">
            {groundingMetadata.groundingChunks.map((chunk: any, index: number) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium min-w-[24px] text-center">
                  {index + 1}
                </span>
                <a
                  href={chunk.web.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline flex-1"
                  title={chunk.web.title}
                >
                  {chunk.web.title}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grounding Supports */}
      {groundingMetadata.groundingSupports && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Grounding Supports ({groundingMetadata.groundingSupports.length}):</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {groundingMetadata.groundingSupports.map((support: any, index: number) => (
              <div key={index} className="border-l-4 border-blue-200 pl-3 py-1 bg-gray-50 text-sm">
                <div className="font-medium text-gray-600 mb-1">
                  Segment {support.segment.startIndex}-{support.segment.endIndex}:
                </div>
                <div className="text-gray-800 italic">"{support.segment.text}"</div>
                <div className="text-xs text-gray-500 mt-1">
                  Sources: {support.groundingChunkIndices?.map((i: number) => `[${i + 1}]`).join(', ') || 'None'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Data for Debugging */}
      <details className="space-y-2">
        <summary className="font-medium text-gray-700 cursor-pointer">Raw Grounding Metadata</summary>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
          {JSON.stringify(groundingMetadata, null, 2)}
        </pre>
      </details>
    </div>
  );
}
