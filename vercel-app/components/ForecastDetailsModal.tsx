"use client";

// Updated: Fixed revenue optimization - removed Get Fresh Prices button - v2.0
import { useState, useEffect } from 'react';
import { buildAviasalesLink, buildHotelLink } from '@/lib/affiliates';
import { generateAffiliateUrls } from '@/lib/dateUtils';

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
  cachedAt: string | null;
  forecastWindow: number;
  criteria: {
    waveMin: number;
    waveMax: number;
    windMax: number;
  };
  days: ForecastDay[];
  isFreshData?: boolean;
  disclaimer?: string;
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
    origin_iata?: string | null;
    dest_iata?: string | null;
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
    hotelLink: string | null;
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
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (isOpen && ruleId) {
      fetchForecastData();
      fetchQuickCheck();
      // Reset view state when opening modal
      setViewMode('detailed');
      setCurrentPage(0);
    }
  }, [isOpen, ruleId]);

  // Auto-switch to compact view for long forecasts
  useEffect(() => {
    if (forecastData && forecastData.days.length > 10) {
      setViewMode('compact');
    }
  }, [forecastData]);

  const fetchForecastData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Modal: Fetching forecast data for ruleId:', ruleId);
      console.log('Modal: Sending alertRule:', alertRule);
      
      const response = await fetch('/api/forecast-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ruleId,
          alertRule
        }),
      });
      
      console.log('Modal: Response status:', response.status);
      console.log('Modal: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Modal: Response error:', errorText);
        
        // Handle 404 (no forecast data) gracefully
        if (response.status === 404) {
          setForecastData(null); // Set to null to indicate no data available
          return;
        }
        
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
      
      const data = await response.json();
      console.log('Modal: Worker trigger response:', data);
      
      if (response.ok) {
        // Success - worker triggered
        console.log('Modal: Worker triggered successfully');
        // Refresh quick check after a delay
        setTimeout(() => {
          fetchQuickCheck();
        }, 5000);
      } else if (response.status === 429) {
        // Cooldown active
        console.log('Modal: Cooldown active:', data);
        // Show cooldown message to user
        alert(`⏰ Cooldown active! Please wait ${data.remainingMinutes} minutes before requesting fresh prices again.\n\nCooldown rules:\n• New alerts: 2 hours\n• Regular users: 6 hours`);
      } else {
        // Other error
        console.error('Modal: Worker trigger failed:', data);
        alert(`❌ Failed to trigger worker: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Modal: Worker trigger error:', err);
      alert('❌ Network error while triggering worker');
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

  // Pagination helpers
  const itemsPerPage = 7; // Show 7 days per page for detailed view
  const totalPages = forecastData ? Math.ceil(forecastData.days.length / itemsPerPage) : 0;
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDays = forecastData ? forecastData.days.slice(startIndex, endIndex) : [];

  // Compact view helpers
  const getCompactDays = () => {
    if (!forecastData) return [];
    return forecastData.days.map(day => ({
      ...day,
      date: new Date(day.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
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
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
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

          {forecastData === null && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="text-blue-600 mb-2">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">No Forecast Data Available</h3>
              <p className="text-blue-700 mb-4">
                Forecast data for this surf spot is not available yet. The worker will fetch fresh forecast data when it runs next.
              </p>
              <div className="text-sm text-blue-600">
                <p>• The worker runs every 6 hours to update forecast data</p>
                <p>• New spots may take up to 6 hours to get their first forecast</p>
                <p>• Check back later or try a different surf spot</p>
              </div>
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
                        <span className="font-medium">Good Days:</span> {forecastData ? forecastData.days.filter(day => day.overallOk).length : 0} / {forecastData ? forecastData.days.length : 0}
                      </p>
                      {forecastData && forecastData.days.filter(day => day.overallOk).length > 0 && (
                        <p className="text-xs text-green-600">
                          Best day: {formatDate(forecastData.days.filter(day => day.overallOk)[0].date)}
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
                        <div className="flex gap-2">
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
                          {quickCheckResult.priceData.hotelLink && (
                            <a
                              href={quickCheckResult.priceData.hotelLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                            >
                              🏨 Book Hotel
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booking Links for Good Conditions (Revenue Optimization) */}
                  {quickCheckResult.conditionsGood && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 mb-2">
                        <span className="font-medium">🎯 Good conditions detected!</span> You can book now while prices are being processed.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            // Use unified date logic for consistent trip duration
                            const goodDays = forecastData?.days
                              ?.filter(day => day.overallOk)
                              ?.map(day => day.date) || [];
                            
                            if (goodDays.length > 0) {
                              try {
                                const origin = alertRule.origin_iata || 'LIS';
                                const dest = alertRule.dest_iata || 'BIQ';
                                const marker = '670448' // Hardcoded affiliate ID for client-side;
                                
                                const { flightUrl } = generateAffiliateUrls(
                                  goodDays,
                                  origin,
                                  dest,
                                  marker,
                                  `alert_${ruleId}`
                                );
                                
                                console.log('Unified flight URL generation:', {
                                  goodDays,
                                  origin,
                                  dest,
                                  flightUrl
                                });
                                
                                window.open(flightUrl, '_blank');
                              } catch (error) {
                                console.error('Error generating unified flight URL:', error);
                                // Fallback to old logic
                                const firstDate = quickCheckResult.forecastSummary?.bestDay || new Date().toISOString().split('T')[0];
                                const forecastWindow = alertRule.forecast_window || 5;
                                const firstDateObj = new Date(firstDate + 'T00:00:00.000Z');
                                const lastDateObj = new Date(firstDateObj.getTime() + (forecastWindow - 1) * 24 * 60 * 60 * 1000);
                                const lastDate = lastDateObj.toISOString().split('T')[0];
                                
                                const aviasalesUrl = buildAviasalesLink({
                                  origin: alertRule.origin_iata || 'LIS',
                                  dest: alertRule.dest_iata || 'BIQ',
                                  departYMD: firstDate,
                                  returnYMD: lastDate,
                                  subId: `alert_${ruleId}`
                                });
                                
                                if (aviasalesUrl) {
                                  window.open(aviasalesUrl, '_blank');
                                }
                              }
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          ✈️ Book Flight
                        </a>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            // Use unified date logic for consistent trip duration
                            const goodDays = forecastData?.days
                              ?.filter(day => day.overallOk)
                              ?.map(day => day.date) || [];
                            
                            if (goodDays.length > 0) {
                              try {
                                const origin = alertRule.origin_iata || 'LIS';
                                const dest = alertRule.dest_iata || 'BIQ';
                                const marker = '670448' // Hardcoded affiliate ID for client-side;
                                
                                const { hotelUrl } = generateAffiliateUrls(
                                  goodDays,
                                  origin,
                                  dest,
                                  marker,
                                  `alert_${ruleId}`
                                );
                                
                                console.log('Unified hotel URL generation:', {
                                  goodDays,
                                  origin,
                                  dest,
                                  hotelUrl
                                });
                                
                                window.open(hotelUrl, '_blank');
                              } catch (error) {
                                console.error('Error generating unified hotel URL:', error);
                                // Fallback to old logic
                                const firstDate = quickCheckResult.forecastSummary?.bestDay || new Date().toISOString().split('T')[0];
                                const forecastWindow = alertRule.forecast_window || 5;
                                const firstDateObj = new Date(firstDate + 'T00:00:00.000Z');
                                const lastDateObj = new Date(firstDateObj.getTime() + (forecastWindow - 1) * 24 * 60 * 60 * 1000);
                                const lastDate = lastDateObj.toISOString().split('T')[0];
                                const dest = alertRule.dest_iata || 'BIQ';
                                
                                const hotelUrl = `https://search.hotellook.com/?destination=${dest}&checkIn=${firstDate}&checkOut=${lastDate}&adults=1&rooms=1&children=0&locale=en&currency=USD&marker=670448&sub_id=alert_${ruleId}`;
                                window.open(hotelUrl, '_blank');
                              }
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                        >
                          🏨 Book Hotel
                        </a>
                      </div>
                      <p className="text-xs text-green-700 mt-2">
                        💡 Price verification will be completed in the next worker run
                      </p>
                    </div>
                  )}

                  {/* No Good Conditions Message */}
                  {!quickCheckResult.conditionsGood && (
                    <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <span className="font-medium">⚠️ Conditions not ideal</span> - No booking links shown as conditions don't meet your criteria.
                      </p>
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
                  {forecastData.cachedAt ? `Data cached: ${formatTime(forecastData.cachedAt)}` : 'Fresh data from Open-Meteo API'}
                </div>
              </div>

              {/* Fresh Data Disclaimer */}
              {forecastData.isFreshData && forecastData.disclaimer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Fresh Forecast Data
                      </h3>
                      <div className="mt-1 text-sm text-blue-700">
                        {forecastData.disclaimer}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Forecast Days */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">
                    Daily Forecast ({forecastData.days.length} days)
                  </h3>
                  <div className="flex items-center gap-2">
                    {forecastData.days.length > 7 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewMode('detailed')}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            viewMode === 'detailed' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Detailed
                        </button>
                        <button
                          onClick={() => setViewMode('compact')}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            viewMode === 'compact' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Compact
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {viewMode === 'detailed' ? (
                  <div className="space-y-3">
                    {currentDays.map((day, index) => (
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
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <button
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                          className="px-3 py-1 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage + 1} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                          disabled={currentPage === totalPages - 1}
                          className="px-3 py-1 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Compact View */
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {getCompactDays().map((day, index) => (
                      <div
                        key={day.date}
                        className={`p-3 rounded-lg border text-center ${
                          day.overallOk 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {day.date}
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {day.wave.avg.toFixed(1)}m / {day.wind.max.toFixed(0)}km/h
                        </div>
                        <div className="flex justify-center">
                          {day.overallOk ? (
                            <span className="text-green-600 text-sm">✅</span>
                          ) : (
                            <span className="text-red-600 text-sm">❌</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
