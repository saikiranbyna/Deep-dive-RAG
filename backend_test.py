import requests
import sys
import json
import time
from datetime import datetime
import io

class DeepDiveRAGTester:
    def __init__(self, base_url="https://10f4b9b0-c2e0-436d-96cf-c83352894cd5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_documents = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if data and not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_document_upload_txt(self):
        """Test uploading a text document"""
        # Create a sample text file
        sample_text = """
        Quantum Computing Overview
        
        Quantum computing is a revolutionary computing paradigm that leverages quantum mechanical phenomena 
        to process information. Unlike classical computers that use bits (0 or 1), quantum computers use 
        quantum bits or qubits that can exist in superposition states.
        
        Key Principles:
        1. Superposition: Qubits can be in multiple states simultaneously
        2. Entanglement: Qubits can be correlated in ways that classical physics cannot explain
        3. Interference: Quantum states can interfere constructively or destructively
        
        Applications:
        - Cryptography and security
        - Drug discovery and molecular modeling
        - Financial modeling
        - Artificial intelligence and machine learning
        """
        
        files = {'file': ('quantum_computing.txt', sample_text, 'text/plain')}
        success, response = self.run_test(
            "Upload TXT Document", 
            "POST", 
            "upload-document", 
            200, 
            files=files
        )
        
        if success and 'document_id' in response:
            self.uploaded_documents.append(response)
            return True
        return False

    def test_document_upload_invalid(self):
        """Test uploading an invalid file type"""
        files = {'file': ('test.xyz', 'invalid content', 'application/octet-stream')}
        success, response = self.run_test(
            "Upload Invalid Document", 
            "POST", 
            "upload-document", 
            400, 
            files=files
        )
        return success

    def test_list_documents(self):
        """Test listing all documents"""
        success, response = self.run_test("List Documents", "GET", "documents", 200)
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} documents")
            return True
        return False

    def test_research_query_simple(self):
        """Test a simple research query"""
        query_data = {"query": "What is quantum computing?"}
        success, response = self.run_test(
            "Simple Research Query", 
            "POST", 
            "research", 
            200, 
            data=query_data
        )
        
        if success and 'session_id' in response:
            print(f"   Session ID: {response['session_id']}")
            print(f"   Status: {response.get('status', 'unknown')}")
            if response.get('final_answer'):
                print(f"   Answer length: {len(response['final_answer'])} chars")
            if response.get('citations'):
                print(f"   Citations: {len(response['citations'])}")
            return response['session_id']
        return None

    def test_research_query_complex(self):
        """Test a complex research query"""
        query_data = {
            "query": "Explain the key principles of quantum computing and how they differ from classical computing. What are the main applications?"
        }
        success, response = self.run_test(
            "Complex Research Query", 
            "POST", 
            "research", 
            200, 
            data=query_data
        )
        
        if success and 'session_id' in response:
            print(f"   Session ID: {response['session_id']}")
            print(f"   Status: {response.get('status', 'unknown')}")
            
            # Check timeline
            if response.get('timeline'):
                print(f"   Timeline steps: {len(response['timeline'])}")
                for step in response['timeline']:
                    print(f"     Step {step['step']}: {step['description']}")
            
            # Check gap questions
            if response.get('gap_questions'):
                print(f"   Gap questions: {len(response['gap_questions'])}")
                for gap in response['gap_questions']:
                    print(f"     - {gap}")
            
            return response['session_id']
        return None

    def test_get_research_session(self, session_id):
        """Test retrieving a research session"""
        if not session_id:
            print("❌ No session ID provided")
            return False
            
        success, response = self.run_test(
            f"Get Research Session", 
            "GET", 
            f"research/{session_id}", 
            200
        )
        
        if success and 'session_id' in response:
            print(f"   Retrieved session: {response['session_id']}")
            return True
        return False

    def test_research_no_documents(self):
        """Test research query when no documents are available"""
        # This would require clearing the database, so we'll skip for now
        print("\n🔍 Testing Research with No Documents...")
        print("   Skipped - would require database cleanup")
        return True

    def test_empty_query(self):
        """Test empty research query"""
        query_data = {"query": ""}
        success, response = self.run_test(
            "Empty Research Query", 
            "POST", 
            "research", 
            200,  # Backend might still return 200 but with error message
            data=query_data
        )
        return success

def main():
    print("🚀 Starting DeepDive RAG Backend Testing")
    print("=" * 50)
    
    tester = DeepDiveRAGTester()
    session_ids = []

    # Test sequence
    print("\n📋 Running API Tests...")
    
    # 1. Test root endpoint
    tester.test_root_endpoint()
    
    # 2. Test document operations
    tester.test_document_upload_txt()
    tester.test_document_upload_invalid()
    tester.test_list_documents()
    
    # 3. Test research operations
    session_id1 = tester.test_research_query_simple()
    if session_id1:
        session_ids.append(session_id1)
        
    session_id2 = tester.test_research_query_complex()
    if session_id2:
        session_ids.append(session_id2)
    
    # 4. Test session retrieval
    for session_id in session_ids:
        tester.test_get_research_session(session_id)
    
    # 5. Test edge cases
    tester.test_empty_query()
    
    # Print final results
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.uploaded_documents:
        print(f"\n📄 Uploaded Documents:")
        for doc in tester.uploaded_documents:
            print(f"  - {doc['filename']}: {doc['chunk_count']} chunks")
    
    if session_ids:
        print(f"\n🔬 Research Sessions Created:")
        for session_id in session_ids:
            print(f"  - {session_id}")
    
    # Return appropriate exit code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())