import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [researchResult, setResearchResult] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState("research"); // research or upload
  const [expandedSources, setExpandedSources] = useState(new Set());

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/upload-document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      alert(`Document uploaded successfully! ${response.data.chunk_count} chunks created.`);
      fetchDocuments();
      event.target.value = ""; // Reset file input
    } catch (error) {
      console.error("Error uploading document:", error);
      alert(`Error uploading document: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleResearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResearchResult(null);

    try {
      const response = await axios.post(`${API}/research`, { query });
      setResearchResult(response.data);
    } catch (error) {
      console.error("Error processing research:", error);
      alert(`Error processing research: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceExpansion = (sourceId) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
  };

  const highlightCitations = (text) => {
    if (!text) return text;
    
    // Replace [Source X] with clickable links
    return text.replace(/\[Source (\d+)\]/g, (match, sourceNum) => {
      return `<span class="citation-link" onclick="document.getElementById('source-${sourceNum}')?.scrollIntoView({behavior: 'smooth'})" title="Click to view source">[Source ${sourceNum}]</span>`;
    });
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DeepDive RAG</h1>
              <p className="text-sm text-gray-600">Interactive AI research assistant with multi-step reasoning</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("research")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "research"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Research
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "upload"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "research" && (
          <div className="space-y-6">
            {/* Search Interface */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Research Query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a complex research question (e.g., 'Explain how quantum computing works and compare it with classical computing')"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleResearch}
                  disabled={loading || !query.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing Research...
                    </>
                  ) : (
                    "Start Deep Research"
                  )}
                </button>
              </div>
            </div>

            {/* Research Results */}
            {researchResult && (
              <div className="space-y-6">
                {/* Timeline */}
                {researchResult.timeline && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Timeline</h3>
                    <div className="space-y-3">
                      {researchResult.timeline.map((step, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {step.step}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{step.description}</p>
                            {step.chunks && (
                              <p className="text-xs text-gray-500">Retrieved {step.chunks} chunks</p>
                            )}
                            {step.gaps && (
                              <p className="text-xs text-gray-500">Identified {step.gaps} knowledge gaps</p>
                            )}
                            {step.citations && (
                              <p className="text-xs text-gray-500">{step.citations} citations added</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final Answer */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Result</h3>
                  <div 
                    className="prose max-w-none text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightCitations(researchResult.final_answer) 
                    }}
                  />
                </div>

                {/* Gap Questions (if available) */}
                {researchResult.gap_questions && researchResult.gap_questions.length > 0 && (
                  <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-3">Knowledge Gaps Identified</h3>
                    <ul className="space-y-2">
                      {researchResult.gap_questions.map((gap, index) => (
                        <li key={index} className="text-yellow-700 flex items-start">
                          <span className="text-yellow-500 mr-2">•</span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sources */}
                {researchResult.citations && researchResult.citations.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Sources ({researchResult.citations.length})
                    </h3>
                    <div className="space-y-4">
                      {researchResult.citations.map((citation, index) => (
                        <div 
                          key={citation.id} 
                          id={`source-${citation.source_number}`}
                          className="border rounded-lg overflow-hidden"
                        >
                          <div 
                            className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                            onClick={() => toggleSourceExpansion(citation.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                                Source {citation.source_number}
                              </span>
                              <span className="font-medium text-gray-900">{citation.filename}</span>
                              <span className="text-sm text-gray-500">
                                Score: {(citation.score * 100).toFixed(1)}%
                              </span>
                            </div>
                            <svg 
                              className={`w-5 h-5 text-gray-500 transform transition-transform ${
                                expandedSources.has(citation.id) ? 'rotate-180' : ''
                              }`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {expandedSources.has(citation.id) && (
                            <div className="p-4 border-t bg-white">
                              <p className="text-gray-700 leading-relaxed">{citation.content}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="space-y-6">
            {/* Upload Interface */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Document
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt,.html,.htm"
                    disabled={uploadingFile}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Supported formats: PDF, DOCX, TXT, HTML
                  </p>
                </div>
                {uploadingFile && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Processing document...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Library */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Document Library ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No documents uploaded yet. Upload your first document to start researching!
                </p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-2 rounded">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{doc.filename}</h4>
                          <p className="text-sm text-gray-500">
                            {doc.file_type.toUpperCase()} • {doc.chunk_count} chunks • {formatTimestamp(doc.upload_date)}
                          </p>
                        </div>
                      </div>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                        Indexed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;