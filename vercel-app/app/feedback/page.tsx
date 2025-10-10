"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setErrorMessage("Please enter your feedback before submitting.");
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("You must be logged in to submit feedback.");
      }

      // Insert feedback into Supabase
      const { error: insertError } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          message: message.trim(),
        });

      if (insertError) {
        throw insertError;
      }

      // Success!
      setSubmitStatus("success");
      setMessage(""); // Clear form
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus("idle");
      }, 5000);

    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      setErrorMessage(error.message || "Failed to submit feedback. Please try again.");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🌊</span>
              <div className="text-2xl font-bold text-slate-900">TideFly</div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="/#features"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Features
              </a>
              <a
                href="/#pricing"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Pricing
              </a>
              <a
                href="/#how-it-works"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                How it works
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="/alerts"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Dashboard
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="space-y-8">
            {/* Header */}
            <div>
              <a
                href="/alerts"
                className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-out mb-4"
              >
                ← Back to alerts
              </a>
              <h1 className="text-3xl font-bold text-slate-900">Feedback</h1>
              <p className="mt-2 text-lg text-slate-600">
                We'd love to hear your thoughts, suggestions, or report any issues you've encountered.
              </p>
            </div>

            {/* Feedback Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="feedback" className="block text-sm font-semibold text-slate-900 mb-2">
                  Your Feedback
                </label>
                <textarea
                  id="feedback"
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your thoughts, ideas, or report any bugs..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 resize-none"
                  disabled={isSubmitting}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Your feedback helps us improve TideFly for everyone. Thank you! 🙏
                </p>
              </div>

              {/* Status Messages */}
              {submitStatus === "success" && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden>✅</span>
                    <span className="font-medium">Thank you for your feedback!</span>
                  </div>
                  <p className="mt-1 text-green-700">
                    We've received your message and will review it soon.
                  </p>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden>❌</span>
                    <span className="font-medium">Oops! Something went wrong.</span>
                  </div>
                  <p className="mt-1 text-red-700">{errorMessage}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="text-lg" aria-hidden>📨</span>
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}


