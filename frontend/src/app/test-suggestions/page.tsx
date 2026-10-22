"use client";

import React from "react";
import SuggestedQuestionsList from "@/features/suggested-questions/components/SuggestedQuestionsList";

export default function TestSuggestionsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Test: Suggested Questions Button</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test 1: With sessionId only */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test 1: sessionId only</h2>
          <p className="text-sm text-muted-foreground mb-2">sessionId: "test-session-123"</p>
          <SuggestedQuestionsList
            sessionId="test-session-123"
            onQuestionClick={(q) => console.log("Clicked:", q)}
            title="Test Suggested Questions"
          />
        </div>

        {/* Test 2: With documentId only */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test 2: documentId only</h2>
          <p className="text-sm text-muted-foreground mb-2">documentId: "doc-123"</p>
          <SuggestedQuestionsList
            documentId="doc-123"
            onQuestionClick={(q) => console.log("Clicked:", q)}
            title="Test Document Questions"
          />
        </div>

        {/* Test 3: With both IDs */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test 3: both IDs</h2>
          <p className="text-sm text-muted-foreground mb-2">sessionId: "test-session-123", documentId: "doc-123"</p>
          <SuggestedQuestionsList
            sessionId="test-session-123"
            documentId="doc-123"
            onQuestionClick={(q) => console.log("Clicked:", q)}
            title="Test Both IDs"
          />
        </div>

        {/* Test 4: No IDs */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test 4: No IDs</h2>
          <p className="text-sm text-muted-foreground mb-2">No sessionId or documentId</p>
          <SuggestedQuestionsList
            onQuestionClick={(q) => console.log("Clicked:", q)}
            title="Test No IDs"
          />
        </div>
      </div>

      <div className="mt-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Debug Info</h2>
        <div className="text-sm space-y-2">
          <p>Component path: frontend/src/features/suggested-questions/components/SuggestedQuestionsList.tsx</p>
          <p>Hook path: frontend/src/features/suggested-questions/hooks/useSuggestedQuestions.ts</p>
          <p className="text-red-600">
            <strong>Expected:</strong> Test 1, 2, and 3 should show "Suggest Questions" button<br />
            <strong>Expected:</strong> Test 4 should show button but clicking should do nothing (no identifiers)
          </p>
        </div>
      </div>
    </div>
  );
}