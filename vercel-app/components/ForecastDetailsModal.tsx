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
}

export function ForecastDetailsModal({ isOpen, onClose, ruleId }: ForecastDetailsModalProps) {
  const [forecastData, setForecastData] = useState<ForecastDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && ruleId) {
      fetchForecastData();
    }
  }, [isOpen, ruleId]);

  const fetchForecastData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/forecast-details?ruleId=${ruleId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch forecast data');
      }
      const data = await response.json();
      setForecastData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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
