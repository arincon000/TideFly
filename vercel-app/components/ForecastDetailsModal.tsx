"use client";

import { useState, useEffect } from 'react';

interface ForecastDay {
  date: string;
  wave: {
    min: number;
    max: number;
    avg: number;
    ok: boolean;
  };
  wind: {
    min: number;
    max: number;
    avg: number;
    ok: boolean;
  };
  morningOk: boolean;
  overallOk: boolean;
  criteria: {
    waveMin: number;
    waveMax: number;
    windMax: number;
  };
}

interface ForecastDetails {
  ruleId: string;
  cachedAt: string;
  forecastWindow: number;
  criteria: {
    waveMin: number;
    waveMax: number;
    windMax: number;
  };
  days: ForecastDay[];
}

interface ForecastDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleId: string;
  alertRule: {
    spot_id: string | null;
    wave_min_m: number | null;
    wave_max_m: number | null;
    wind_max_kmh: number | null;
    forecast_window: number | null;
    planning_logic?: string;
  };
}

interface QuickForecastResult {
  conditionsGood: boolean;
  priceDataAvailable: boolean;
  priceFreshness: 'fresh' | 'stale' | 'none';
  shouldTriggerWorker: boolean;
  forecastSummary: {
    goodDays: number;
    totalDays: number;
    bestDay?: string;
  };
  priceData?: {
    price: number | null;
    affiliateLink: string | null;
    cachedAt: string | null;
    warning?: string;
  };
}

export function ForecastDetailsModal({ isOpen, onClose, ruleId, alertRule }: ForecastDetailsModalProps) {
  const [forecastData, setForecastData] = useState<ForecastDetails | null>(null);
  const [quickCheckResult, setQuickCheckResult] = useState<QuickForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggeringWorker, setTriggeringWorker] = useState(false);

  useEffect(() => {
    if (isOpen && ruleId) {
      fetchForecastData();
      fetchQuickCheck();
    }
  }, [isOpen, ruleId]);

  const fetchForecastData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Modal: Fetching forecast data for ruleId:', ruleId);
      console.log('Modal: Sending alertRule:', alertRule);
      
      const response = await fetch(`/api/forecast-details?ruleId=${ruleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertRule),
      });
      
      console.log('Modal: Response status:', response.status);
      console.log('Modal: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Modal: Response error:', errorText);
        throw new Error(`Failed to fetch forecast data: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Modal: Received data:', data);
      setForecastData(data);
    } catch (err) {
      console.error('Modal: Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickCheck = async () => {
    try {
      console.log('Modal: Fetching quick check for ruleId:', ruleId);
      
      const response = await fetch('/api/quick-forecast-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          alertRule
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Modal: Quick check result:', data);
        setQuickCheckResult(data);
      } else {
        console.error('Modal: Quick check failed:', response.status);
      }
    } catch (err) {
      console.error('Modal: Quick check error:', err);
    }
  };

  const triggerWorker = async () => {
    setTriggeringWorker(true);
    try {
      const response = await fetch('/api/trigger-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          reason: 'user_request'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Modal: Worker triggered:', data);
        // Refresh quick check after a delay
        setTimeout(() => {
          fetchQuickCheck();
        }, 5000);
      }
    } catch (err) {
      console.error('Modal: Worker trigger error:', err);
    } finally {
      setTriggeringWorker(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Forecast Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600">Loading forecast data...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {forecastData && (
            <div className="space-y-6">
              {/* Quick Check Results */}
              {quickCheckResult && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-green-800">🏄‍♂️ Quick Forecast Check</h3>
                    <div className="flex items-center gap-2">
                      {quickCheckResult.conditionsGood ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          ✅ Good Conditions
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                          ❌ No Good Days
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-green-700">
                        <span className="font-medium">Good Days:</span> {quickCheckResult.forecastSummary.goodDays} / {quickCheckResult.forecastSummary.totalDays}
                      </p>
                      {quickCheckResult.forecastSummary.bestDay && (
                        <p className="text-xs text-green-600">
                          Best day: {formatDate(quickCheckResult.forecastSummary.bestDay)}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-green-700">
                        <span className="font-medium">Price Data:</span> {
                          quickCheckResult.priceFreshness === 'fresh' ? '✅ Fresh' :
                          quickCheckResult.priceFreshness === 'stale' ? '⚠️ Stale' :
                          '❌ None'
                        }
                      </p>
                      {quickCheckResult.priceData && (
                        <p className="text-xs text-green-600">
                          {quickCheckResult.priceData.price ? `€${quickCheckResult.priceData.price.toFixed(0)}` : 'No price'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price Data Display */}
                  {quickCheckResult.priceData && quickCheckResult.priceData.price && (
                    <div className="mb-3 p-3 bg-white border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            Flight Price: €{quickCheckResult.priceData.price.toFixed(0)}
                          </p>
                          {quickCheckResult.priceData.warning && (
                            <p className="text-xs text-orange-600">{quickCheckResult.priceData.warning}</p>
                          )}
                        </div>
                        {quickCheckResult.priceData.affiliateLink && (
                          <a
                            href={quickCheckResult.priceData.affiliateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                          >
                            🛫 Book Flight
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Worker Trigger Button */}
                  {quickCheckResult.shouldTriggerWorker && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          {quickCheckResult.priceFreshness === 'none' ? 'No price data available' : 'Price data is stale'}
                        </p>
                        <p className="text-xs text-yellow-700">
                          Trigger worker to get fresh flight prices
                        </p>
                      </div>
                      <button
                        onClick={triggerWorker}
                        disabled={triggeringWorker}
                        className="inline-flex items-center gap-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {triggeringWorker ? '⏳ Triggering...' : '🚀 Get Fresh Prices'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Criteria Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Your Alert Criteria</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Wave Height:</span>
                    <span className="ml-2 font-medium">
                      {forecastData.criteria.waveMin}m - {forecastData.criteria.waveMax}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Wind Speed:</span>
                    <span className="ml-2 font-medium">≤ {forecastData.criteria.windMax} km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Forecast Window:</span>
                    <span className="ml-2 font-medium">{forecastData.forecastWindow} days</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Planning Logic:</span>
                    <span className="ml-2 font-medium capitalize">{alertRule.planning_logic || 'conservative'}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Data cached: {formatTime(forecastData.cachedAt)}
                </div>
              </div>

              {/* Forecast Days */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Daily Forecast</h3>
                <div className="space-y-3">
                  {forecastData.days.map((day, index) => (
                    <div
                      key={day.date}
                      className={`border rounded-lg p-4 ${
                        day.overallOk 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900">
                          {formatDate(day.date)}
                        </h4>
                        <div className="flex items-center gap-2">
                          {day.overallOk ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                              ✅ Good conditions
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                              ❌ Conditions not met
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Wave Conditions */}
                        <div className={`p-3 rounded-lg ${
                          day.wave.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🌊</span>
                            <span className="font-medium text-slate-900">Wave Height</span>
                            {day.wave.ok ? (
                              <span className="text-green-600 text-sm">✓</span>
                            ) : (
                              <span className="text-red-600 text-sm">✗</span>
                            )}
                          </div>
                          <div className="text-sm space-y-1">
                            <div>Min: {day.wave.min.toFixed(1)}m</div>
                            <div>Max: {day.wave.max.toFixed(1)}m</div>
                            <div>Avg: {day.wave.avg.toFixed(1)}m</div>
                            <div className="text-xs text-slate-600">
                              Required: {day.criteria.waveMin}m - {day.criteria.waveMax}m
                            </div>
                          </div>
                        </div>

                        {/* Wind Conditions */}
                        <div className={`p-3 rounded-lg ${
                          day.wind.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">💨</span>
                            <span className="font-medium text-slate-900">Wind Speed</span>
                            {day.wind.ok ? (
                              <span className="text-green-600 text-sm">✓</span>
                            ) : (
                              <span className="text-red-600 text-sm">✗</span>
                            )}
                          </div>
                          <div className="text-sm space-y-1">
                            <div>Min: {day.wind.min.toFixed(1)} km/h</div>
                            <div>Max: {day.wind.max.toFixed(1)} km/h</div>
                            <div>Avg: {day.wind.avg.toFixed(1)} km/h</div>
                            <div className="text-xs text-slate-600">
                              Required: ≤ {day.criteria.windMax} km/h
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Morning Check */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-lg">🌅</span>
                        <span className="text-sm text-slate-600">Morning conditions:</span>
                        {day.morningOk ? (
                          <span className="text-green-600 text-sm font-medium">Good</span>
                        ) : (
                          <span className="text-red-600 text-sm font-medium">Poor</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
