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
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      showNotification("Error fetching documents", "error");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification("File size must be less than 10MB", "error");
      event.target.value = "";
      return;
    }

    // Validate file type
    const allowedTypes = ['pdf', 'docx', 'txt', 'html', 'htm'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      showNotification("Please upload PDF, DOCX, TXT, or HTML files only", "error");
      event.target.value = "";
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/upload-document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      showNotification(response.data.message, "success");
      fetchDocuments();
      event.target.value = ""; // Reset file input
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorMessage = error.response?.data?.detail || error.message;
      showNotification(`Upload failed: ${errorMessage}`, "error");
      event.target.value = "";
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (documentId, filename) => {
    setDeletingDocument(documentId);
    try {
      const response = await axios.delete(`${API}/documents/${documentId}`);
      showNotification(response.data.message, "success");
      fetchDocuments();
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      const errorMessage = error.response?.data?.detail || error.message;
      showNotification(`Delete failed: ${errorMessage}`, "error");
    } finally {
      setDeletingDocument(null);
    }
  };

  const handleDeleteAllDocuments = async () => {
    if (!window.confirm("Are you sure you want to delete ALL documents? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await axios.delete(`${API}/documents`);
      showNotification(response.data.message, "success");
      fetchDocuments();
      setResearchResult(null); // Clear any existing research results
    } catch (error) {
      console.error("Error deleting all documents:", error);
      const errorMessage = error.response?.data?.detail || error.message;
      showNotification(`Delete failed: ${errorMessage}`, "error");
    }
  };

  const handleResearch = async () => {
    if (!query.trim()) {
      showNotification("Please enter a research query", "error");
      return;
    }
    
    if (documents.length === 0) {
      showNotification("Please upload some documents first", "error");
      return;
    }
    
    setLoading(true);
    setResearchResult(null);

    try {
      const response = await axios.post(`${API}/research`, { query: query.trim() });
      setResearchResult(response.data);
      
      if (response.data.status === "completed") {
        showNotification("Research completed successfully!", "success");
      } else {
        showNotification("Research completed with issues", "warning");
      }
    } catch (error) {
      console.error("Error processing research:", error);
      const errorMessage = error.response?.data?.detail || error.message;
      showNotification(`Research failed: ${errorMessage}`, "error");
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearResearch = () => {
    setResearchResult(null);
    setQuery("");
    showNotification("Research results cleared", "info");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-lg font-bold hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirmation.filename}"? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(deleteConfirmation.id, deleteConfirmation.filename)}
                disabled={deletingDocument === deleteConfirmation.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletingDocument === deleteConfirmation.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                Manage Documents
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Research Query
                  </label>
                  {researchResult && (
                    <button
                      onClick={clearResearch}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear Results
                    </button>
                  )}
                </div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a complex research question (e.g., 'Explain how quantum computing works and compare it with classical computing')"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {documents.length} document(s) available for research
                  </div>
                  <button
                    onClick={handleResearch}
                    disabled={loading || !query.trim() || documents.length === 0}
                    className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
            </div>

            {/* Research Results */}
            {researchResult && (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border ${
                  researchResult.status === 'completed' 
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : researchResult.status === 'failed'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Research Status: {researchResult.status.charAt(0).toUpperCase() + researchResult.status.slice(1)}
                    </span>
                    <span className="text-sm">Session: {researchResult.session_id}</span>
                  </div>
                </div>

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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h3>
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Supported formats: PDF, DOCX, TXT, HTML</p>
                    <p>Maximum file size: 10MB</p>
                  </div>
                </div>
                {uploadingFile && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">Processing document...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Library */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Document Library ({documents.length})
                </h3>
                {documents.length > 0 && (
                  <button
                    onClick={handleDeleteAllDocuments}
                    className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    Delete All
                  </button>
                )}
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload your first document to start researching!
                  </p>
                </div>
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
                      <div className="flex items-center space-x-3">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                          Indexed
                        </span>
                        <button
                          onClick={() => setDeleteConfirmation({ id: doc.id, filename: doc.filename })}
                          disabled={deletingDocument === doc.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Delete document"
                        >
                          {deletingDocument === doc.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
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